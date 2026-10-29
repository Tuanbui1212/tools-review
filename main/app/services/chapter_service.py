from collections.abc import Sequence
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.chapter import Chapter, ChapterPage
from app.models.user import User
from app.repositories.chapter_page_repository import ChapterPageRepository
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.project_member_repository import ProjectMemberRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.chapter import ChapterCreate, ChapterPageRead, ChapterRead, ChapterUpdate
from app.services.image_ingest_service import ImageIngestService
from app.services.project_policy import ProjectPolicy


class ChapterService:
    def __init__(
        self,
        db: Session,
        chapter_repo: ChapterRepository,
        page_repo: ChapterPageRepository,
        project_repo: ProjectRepository,
        member_repo: ProjectMemberRepository,
        ingest_service: ImageIngestService | None = None,
    ) -> None:
        self.db = db
        self.chapter_repo = chapter_repo
        self.page_repo = page_repo
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.ingest_service = ingest_service or ImageIngestService()

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dữ liệu bị trùng lặp hoặc xung đột",
            ) from exc

    def _get_project_and_check_view(self, actor: User, project_id: int):
        project = self.project_repo.get_with_details(project_id)
        if not project or project.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy dự án")

        membership = self.member_repo.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy dự án")
        return project, membership

    def _get_chapter_and_check_view(self, actor: User, chapter_id: int) -> tuple[Chapter, any]:
        chapter = self.chapter_repo.get_by_id(chapter_id)
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tập truyện")

        project, membership = self._get_project_and_check_view(actor, chapter.project_id)
        return chapter, (project, membership)

    def _check_edit_permission(self, actor: User, project, membership):
        if not ProjectPolicy.can_edit(actor, project, membership):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa tập truyện này",
            )

    def _check_delete_permission(self, actor: User, project, membership):
        if not ProjectPolicy.can_delete(actor, project, membership):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ chủ sở hữu hoặc quản lý mới có quyền xoá tập truyện này",
            )

    def list_chapters(
        self,
        actor: User,
        project_id: int,
        *,
        status_filter: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Chapter], int]:
        self._get_project_and_check_view(actor, project_id)
        return self.chapter_repo.list_by_project(
            project_id,
            status=status_filter,
            offset=offset,
            limit=limit,
        )

    def create_chapter(self, actor: User, project_id: int, data: ChapterCreate) -> Chapter:
        project, membership = self._get_project_and_check_view(actor, project_id)
        self._check_edit_permission(actor, project, membership)

        # Kiểm tra trùng chapter_number
        existing = self.chapter_repo.get_by_project_and_number(project_id, data.chapter_number)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tập truyện số {data.chapter_number} đã tồn tại trong dự án",
            )

        chapter = Chapter(
            project_id=project_id,
            chapter_number=data.chapter_number,
            title=data.title,
            status="draft",
            total_pages=0,
            created_by_id=actor.id,
        )
        self.chapter_repo.add(chapter)
        self._commit()
        return chapter

    def get_chapter(self, actor: User, chapter_id: int) -> Chapter:
        chapter, _ = self._get_chapter_and_check_view(actor, chapter_id)
        return chapter

    def update_chapter(self, actor: User, chapter_id: int, data: ChapterUpdate) -> Chapter:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        if data.title is not None:
            chapter.title = data.title
        if data.status is not None:
            chapter.status = data.status

        self.chapter_repo.add(chapter)
        self._commit()
        return chapter

    def delete_chapter(self, actor: User, chapter_id: int) -> None:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_delete_permission(actor, project, membership)
        self.chapter_repo.soft_delete(chapter)

    def upload_images(
        self,
        actor: User,
        chapter_id: int,
        raw_files: list[tuple[str, bytes]],
    ) -> list[ChapterPage]:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        if not raw_files:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không có file ảnh nào được chọn")

        current_max = self.page_repo.get_max_page_number(chapter.id)
        existing_hashes = self.page_repo.get_existing_hashes(chapter.id)

        try:
            pages = self.ingest_service.process_raw_images(
                chapter, raw_files, current_max, existing_hashes
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

        self.page_repo.add_pages_bulk(chapter, pages)
        return pages

    def upload_zip(
        self,
        actor: User,
        chapter_id: int,
        zip_content: bytes,
    ) -> list[ChapterPage]:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        current_max = self.page_repo.get_max_page_number(chapter.id)
        existing_hashes = self.page_repo.get_existing_hashes(chapter.id)

        try:
            pages = self.ingest_service.process_zip_file(
                chapter, zip_content, current_max, existing_hashes
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

        self.page_repo.add_pages_bulk(chapter, pages)
        return pages

    def list_pages(self, actor: User, chapter_id: int) -> list[ChapterPageRead]:
        chapter, _ = self._get_chapter_and_check_view(actor, chapter_id)
        pages = self.page_repo.list_by_chapter(chapter.id)

        results: list[ChapterPageRead] = []
        for p in pages:
            file_url = f"/api/v1/chapters/{chapter.id}/pages/{p.id}/file"
            item = ChapterPageRead(
                id=p.id,
                chapter_id=p.chapter_id,
                page_number=p.page_number,
                original_filename=p.original_filename,
                file_size_bytes=p.file_size_bytes,
                width=p.width,
                height=p.height,
                mime_type=p.mime_type,
                file_hash=p.file_hash,
                is_duplicate_hash=p.is_duplicate_hash,
                file_url=file_url,
                created_at=p.created_at,
            )
            results.append(item)
        return results

    def reorder_pages(self, actor: User, chapter_id: int, page_ids: list[int]) -> list[ChapterPageRead]:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        try:
            self.page_repo.reorder_pages(chapter, page_ids)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

        return self.list_pages(actor, chapter.id)

    def delete_page(self, actor: User, chapter_id: int, page_id: int) -> None:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        page = self.page_repo.get_by_id(page_id)
        if not page or page.chapter_id != chapter.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy trang ảnh")

        file_path = page.file_path
        self.page_repo.delete_page_and_reindex(chapter, page)
        self.ingest_service.delete_file(file_path)

    def clear_all_pages(self, actor: User, chapter_id: int) -> None:
        chapter, (project, membership) = self._get_chapter_and_check_view(actor, chapter_id)
        self._check_edit_permission(actor, project, membership)

        file_paths = self.page_repo.clear_all_pages(chapter)
        for fp in file_paths:
            self.ingest_service.delete_file(fp)

    def get_page_file_path(self, actor: User, chapter_id: int, page_id: int) -> Path:
        chapter, _ = self._get_chapter_and_check_view(actor, chapter_id)
        page = self.page_repo.get_by_id(page_id)
        if not page or page.chapter_id != chapter.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy trang ảnh")

        p = Path(page.file_path)
        if not p.exists() or not p.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tệp ảnh vật lý không tồn tại trên máy chủ")
        return p
