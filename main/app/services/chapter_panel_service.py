import os
from collections.abc import Sequence

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
    ) -> None:
        self.db = db
        self.panel_repo = panel_repo
        self.chapter_repo = chapter_repo
        self.page_repo = page_repo
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.task_service = task_service

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

        new_panels = [
            ChapterPanel(
                chapter_id=chapter.id,
                chapter_page_id=page.id,
                panel_number=1,  # Sẽ được recalculate trong repository
                panel_index_in_page=item.panel_index_in_page,
                bbox_x=item.bbox_x,
                bbox_y=item.bbox_y,
                bbox_width=item.bbox_width,
                bbox_height=item.bbox_height,
                is_full_page=item.is_full_page,
            )
            for item in data.panels
        ]

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
                image_path=item.image_path,
                google_drive_file_id=item.google_drive_file_id,
                is_full_page=item.is_full_page,
            )
            for item in panels_data
        ]

        result = self.panel_repo.save_batch_panels(chapter_id, panels)
        # Chuyển trạng thái chapter về ready sau khi cắt xong
        chapter.status = "ready"
        self.db.add(chapter)
        self.db.commit()
        return result
