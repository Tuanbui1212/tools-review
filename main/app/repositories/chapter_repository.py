from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select

from app.models.chapter import Chapter
from app.repositories.base import BaseRepository


class ChapterRepository(BaseRepository[Chapter]):
    model = Chapter

    def get_by_id(self, chapter_id: int, *, include_deleted: bool = False) -> Chapter | None:
        stmt = select(Chapter).where(Chapter.id == chapter_id)
        if not include_deleted:
            stmt = stmt.where(Chapter.deleted_at.is_(None))
        return self.db.scalar(stmt)

    def get_by_project_and_number(
        self,
        project_id: int,
        chapter_number: int,
        *,
        include_deleted: bool = False,
    ) -> Chapter | None:
        stmt = select(Chapter).where(
            Chapter.project_id == project_id,
            Chapter.chapter_number == chapter_number,
        )
        if not include_deleted:
            stmt = stmt.where(Chapter.deleted_at.is_(None))
        return self.db.scalar(stmt)

    def list_by_project(
        self,
        project_id: int,
        *,
        status: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Chapter], int]:
        base_stmt = select(Chapter).where(
            Chapter.project_id == project_id,
            Chapter.deleted_at.is_(None),
        )
        if status:
            base_stmt = base_stmt.where(Chapter.status == status)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = self.db.scalar(count_stmt) or 0

        stmt = base_stmt.order_by(Chapter.chapter_number.asc()).offset(offset).limit(limit)
        items = self.db.scalars(stmt).all()
        return items, total

    def soft_delete(self, chapter: Chapter) -> None:
        chapter.deleted_at = datetime.now()
        self.db.add(chapter)
        self.db.commit()
