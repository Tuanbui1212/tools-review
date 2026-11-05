import os
from collections.abc import Sequence

from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, NotFoundError
from app.models.chapter import Chapter, ChapterPage
from app.models.chapter_panel import ChapterPanel
from app.models.pipeline_task import PipelineTask
from app.models.project import Project
from app.models.user import User
from app.repositories.chapter_page_repository import ChapterPageRepository
from app.repositories.chapter_panel_repository import ChapterPanelRepository
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.project_member_repository import ProjectMemberRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.chapter_panel import ChapterPanelCreate, PagePanelsUpdate
from app.services.image_ingest_service import ImageIngestService
from app.services.pipeline_task_service import PipelineTaskService


class ChapterPanelService:
    def __init__(
        self,
        db: Session,
        panel_repo: ChapterPanelRepository,
        chapter_repo: ChapterRepository,
        page_repo: ChapterPageRepository,
        project_repo: ProjectRepository,
        member_repo: ProjectMemberRepository,
        task_service: PipelineTaskService,
        ingest_service: ImageIngestService | None = None,
    ) -> None:
        self.db = db
        self.panel_repo = panel_repo
        self.chapter_repo = chapter_repo
        self.page_repo = page_repo
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.task_service = task_service
        self.ingest_service = ingest_service or ImageIngestService()

    def _ensure_chapter_view_access(self, actor: User, chapter_id: int) -> tuple[Chapter, Project]:
        chapter = self.chapter_repo.get(chapter_id)
        if not chapter or chapter.deleted_at is not None:
            raise NotFoundError("chapter_not_found", "Không tìm thấy chapter")

        project = self.project_repo.get(chapter.project_id)
        if not project or project.deleted_at is not None:
            raise NotFoundError("project_not_found", "Không tìm thấy project")

        if actor.system_role in ("admin", "root"):
            return chapter, project

        member = self.member_repo.get_membership(project.id, actor.id)
        if not member:
            raise ForbiddenError("forbidden", "Bạn không có quyền truy cập chapter này")

        return chapter, project

    def _ensure_chapter_edit_access(self, actor: User, chapter_id: int) -> tuple[Chapter, Project]:
        chapter, project = self._ensure_chapter_view_access(actor, chapter_id)
        if actor.system_role in ("admin", "root"):
            return chapter, project

        member = self.member_repo.get_membership(project.id, actor.id)
        if not member or member.role not in ("owner", "member"):
            raise ForbiddenError("forbidden", "Bạn không có quyền chỉnh sửa chapter này")

        return chapter, project

    def trigger_extract_panels(self, actor: User, chapter_id: int) -> PipelineTask:
        chapter, project = self._ensure_chapter_edit_access(actor, chapter_id)

        pages = self.page_repo.list_by_chapter(chapter.id)
        if not pages:
            raise NotFoundError("no_pages", "Chapter chưa có trang ảnh nào để cắt khung")

        # Cập nhật trạng thái chapter -> processing
        chapter.status = "processing"
        self.db.add(chapter)
        self.db.commit()

        # Tạo và điều phối Task Celery sang ai_queue
        payload = {
            "chapter_id": chapter.id,
            "project_id": project.id,
            "reading_direction": project.reading_direction or "rtl",
            "total_pages": len(pages),
        }
        task = self.task_service.create_and_dispatch_task(
            "ai.extract_panels",
            project_id=project.id,
            chapter_id=chapter.id,
            task_type="ai.extract_panels",
            queue_name="ai_queue",
            payload=payload,
            actor=actor,
        )
        return task

    def list_chapter_panels(self, actor: User, chapter_id: int) -> Sequence[ChapterPanel]:
        self._ensure_chapter_view_access(actor, chapter_id)
        return self.panel_repo.list_by_chapter(chapter_id)

    def list_page_panels(self, actor: User, page_id: int) -> Sequence[ChapterPanel]:
        page = self.page_repo.get_by_id(page_id)
        if not page:
            raise NotFoundError("page_not_found", "Không tìm thấy trang")
        self._ensure_chapter_view_access(actor, page.chapter_id)
        return self.panel_repo.list_by_page(page_id)

    def update_page_panels(
        self,
        actor: User,
        page_id: int,
        data: PagePanelsUpdate,
    ) -> Sequence[ChapterPanel]:
        page = self.page_repo.get_by_id(page_id)
        if not page:
            raise NotFoundError("page_not_found", "Không tìm thấy trang")
        chapter, _ = self._ensure_chapter_edit_access(actor, page.chapter_id)

        # Thư mục lưu panels đã cắt
        panels_dir = os.path.join(
            str(self.ingest_service.base_dir),
            "projects",
            str(chapter.project_id),
            "chapters",
            str(chapter.id),
            "panels",
        )
        os.makedirs(panels_dir, exist_ok=True)

        page_file_path = self.ingest_service.get_local_file_path(page.file_path)

        new_panels: list[ChapterPanel] = []
        try:
            with Image.open(page_file_path) as full_img:
                img_w, img_h = full_img.size
                for idx, item in enumerate(data.panels, start=1):
                    poly = item.polygon_points
                    if poly and len(poly) >= 3:
                        min_x = max(0, min(p[0] for p in poly))
                        min_y = max(0, min(p[1] for p in poly))
                        max_x = min(img_w, max(p[0] for p in poly))
                        max_y = min(img_h, max(p[1] for p in poly))
                        bw = max(1, max_x - min_x)
                        bh = max(1, max_y - min_y)

                        x1, y1, x2, y2 = min_x, min_y, max_x, max_y
                        crop_box = full_img.crop((x1, y1, x2, y2)).convert("RGBA")

                        # Tạo mask nhị phân cho đa giác
                        mask = Image.new("L", (bw, bh), 0)
                        local_poly = [(int(p[0] - x1), int(p[1] - y1)) for p in poly]
                        ImageDraw.Draw(mask).polygon(local_poly, fill=255)

                        # Nền trong suốt với phần trong đa giác
                        final_crop = Image.new("RGBA", (bw, bh), (255, 255, 255, 0))
                        final_crop.paste(crop_box, (0, 0), mask=mask)

                        panel_filename = f"p{page.page_number:03d}_panel_{idx}.png"
                        panel_dest = os.path.join(panels_dir, panel_filename)
                        final_crop.save(panel_dest, "PNG")

                        item_bbox_x, item_bbox_y = x1, y1
                        item_bbox_w, item_bbox_h = bw, bh
                    else:
                        poly = None
                        x1 = max(0, min(img_w - 1, item.bbox_x))
                        y1 = max(0, min(img_h - 1, item.bbox_y))
                        x2 = max(x1 + 1, min(img_w, x1 + item.bbox_width))
                        y2 = max(y1 + 1, min(img_h, y1 + item.bbox_height))

                        crop_img = full_img.crop((x1, y1, x2, y2))
                        panel_filename = f"p{page.page_number:03d}_panel_{idx}.jpg"
                        panel_dest = os.path.join(panels_dir, panel_filename)
                        crop_img.convert("RGB").save(panel_dest, "JPEG", quality=95)

                        item_bbox_x, item_bbox_y = item.bbox_x, item.bbox_y
                        item_bbox_w, item_bbox_h = item.bbox_width, item.bbox_height

                    new_panels.append(
                        ChapterPanel(
                            chapter_id=chapter.id,
                            chapter_page_id=page.id,
                            panel_number=1,
                            panel_index_in_page=item.panel_index_in_page,
                            bbox_x=item_bbox_x,
                            bbox_y=item_bbox_y,
                            bbox_width=item_bbox_w,
                            bbox_height=item_bbox_h,
                            is_full_page=item.is_full_page,
                            image_path=str(panel_dest),
                            source="manual",
                            polygon_points=poly,
                        )
                    )
        except Exception:
            for item in data.panels:
                new_panels.append(
                    ChapterPanel(
                        chapter_id=chapter.id,
                        chapter_page_id=page.id,
                        panel_number=1,
                        panel_index_in_page=item.panel_index_in_page,
                        bbox_x=item.bbox_x,
                        bbox_y=item.bbox_y,
                        bbox_width=item.bbox_width,
                        bbox_height=item.bbox_height,
                        is_full_page=item.is_full_page,
                        source="manual",
                        polygon_points=item.polygon_points,
                    )
                )

        return self.panel_repo.replace_page_panels(chapter.id, page.id, new_panels)

    def reorder_panels(
        self,
        actor: User,
        chapter_id: int,
        panel_ids: list[int],
    ) -> Sequence[ChapterPanel]:
        self._ensure_chapter_edit_access(actor, chapter_id)
        return self.panel_repo.reorder_panels(chapter_id, panel_ids)

    def get_panel_file_path(self, actor: User, chapter_id: int, panel_id: int) -> str:
        self._ensure_chapter_view_access(actor, chapter_id)
        panel = self.panel_repo.get_by_id(panel_id)
        if not panel or panel.chapter_id != chapter_id or not panel.image_path:
            raise NotFoundError("panel_file_not_found", "Không tìm thấy file ảnh của panel")
        if not os.path.exists(panel.image_path):
            raise NotFoundError("file_not_found", "File ảnh panel không tồn tại trên đĩa")
        return panel.image_path

    # --- Internal Methods cho Worker AI ---

    def save_panels_batch_internal(
        self,
        chapter_id: int,
        panels_data: list[ChapterPanelCreate],
    ) -> list[ChapterPanel]:
        """Worker gọi để ghi đè danh sách panel đã cắt vào DB và cập nhật status chapter."""
        chapter = self.chapter_repo.get(chapter_id)
        if not chapter:
            raise NotFoundError("chapter_not_found", "Không tìm thấy chapter")

        panels = [
            ChapterPanel(
                chapter_id=chapter_id,
                chapter_page_id=item.chapter_page_id,
                panel_number=item.panel_number,
                panel_index_in_page=item.panel_index_in_page,
                bbox_x=item.bbox_x,
                bbox_y=item.bbox_y,
                bbox_width=item.bbox_width,
                bbox_height=item.bbox_height,
                image_path=getattr(item, "image_path", None),
                google_drive_file_id=item.google_drive_file_id,
                is_full_page=item.is_full_page,
                source="manual",
            )
            for item in panels_data
        ]

        result = self.panel_repo.save_batch_panels(chapter_id, panels)
        # Chuyển trạng thái chapter về ready sau khi cắt xong
        chapter.status = "ready"
        self.db.add(chapter)
        self.db.commit()
        return result

    def extract_single_page_panels(
        self, actor: User, chapter_id: int, page_id: int
    ) -> Sequence[ChapterPanel]:
        """Tự động cắt lại chỉ riêng 1 trang bằng Worker AI (đồng bộ trong ~0.3s)."""
        self._ensure_chapter_edit_access(actor, chapter_id)
        chapter = self.chapter_repo.get(chapter_id)
        page = self.page_repo.get_by_id(page_id)
        if not page or page.chapter_id != chapter_id:
            raise NotFoundError("page_not_found", "Không tìm thấy trang ảnh")

        from app.integrations.task_queue import send_task
        from fastapi import HTTPException, status

        async_res = send_task(
            "ai.extract_single_page",
            queue="ai_queue",
            kwargs={
                "project_id": chapter.project_id,
                "chapter_id": chapter_id,
                "page_id": page_id,
            },
        )
        try:
            async_res.get(timeout=15.0)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi khi worker cắt trang: {e}",
            )

        return self.panel_repo.list_by_page(page_id)

    def save_single_page_panels_internal(
        self, chapter_id: int, page_id: int, data: PagePanelsUpdate
    ) -> Sequence[ChapterPanel]:
        """Worker gọi cập nhật các panel của 1 trang cụ thể."""
        new_panels = [
            ChapterPanel(
                chapter_id=chapter_id,
                chapter_page_id=page_id,
                panel_number=item.panel_index_in_page,
                panel_index_in_page=item.panel_index_in_page,
                bbox_x=item.bbox_x,
                bbox_y=item.bbox_y,
                bbox_width=item.bbox_width,
                bbox_height=item.bbox_height,
                image_path=getattr(item, "image_path", None),
                is_full_page=item.is_full_page,
                source="ai",
            )
            for item in data.panels
        ]
        return self.panel_repo.replace_page_panels(chapter_id, page_id, new_panels)
