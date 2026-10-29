from collections.abc import Sequence

from sqlalchemy import delete, select

from app.models.chapter import Chapter, ChapterPage
from app.repositories.base import BaseRepository


class ChapterPageRepository(BaseRepository[ChapterPage]):
    model = ChapterPage

    def get_by_id(self, page_id: int) -> ChapterPage | None:
        stmt = select(ChapterPage).where(ChapterPage.id == page_id)
        return self.db.scalar(stmt)

    def list_by_chapter(self, chapter_id: int) -> Sequence[ChapterPage]:
        stmt = (
            select(ChapterPage)
            .where(ChapterPage.chapter_id == chapter_id)
            .order_by(ChapterPage.page_number.asc())
        )
        return self.db.scalars(stmt).all()

    def get_existing_hashes(self, chapter_id: int) -> set[str]:
        stmt = select(ChapterPage.file_hash).where(ChapterPage.chapter_id == chapter_id)
        return set(self.db.scalars(stmt).all())

    def get_max_page_number(self, chapter_id: int) -> int:
        stmt = (
            select(ChapterPage.page_number)
            .where(ChapterPage.chapter_id == chapter_id)
            .order_by(ChapterPage.page_number.desc())
            .limit(1)
        )
        val = self.db.scalar(stmt)
        return val if val is not None else 0

    def add_pages_bulk(self, chapter: Chapter, pages: list[ChapterPage]) -> None:
        for p in pages:
            self.db.add(p)
        chapter.total_pages += len(pages)
        if chapter.status == "draft" and chapter.total_pages > 0:
            chapter.status = "ready"
        self.db.add(chapter)
        self.db.commit()

    def reorder_pages(self, chapter: Chapter, page_ids: list[int]) -> Sequence[ChapterPage]:
        current_pages = {p.id: p for p in self.list_by_chapter(chapter.id)}
        if set(page_ids) != set(current_pages.keys()):
            raise ValueError("Danh sách page_ids không khớp với danh sách trang của chapter")

        # Bước 1: Gán page_number tạm thời sang số dương lớn để tránh vi phạm UniqueConstraint và thoả mãn CheckConstraint >= 1
        for p in current_pages.values():
            p.page_number = 1_000_000 + p.id
            self.db.add(p)
        self.db.flush()

        # Bước 2: Gán page_number chuẩn từ 1 đến N theo thứ tự page_ids
        for idx, pid in enumerate(page_ids, start=1):
            p = current_pages[pid]
            p.page_number = idx
            self.db.add(p)

        self.db.commit()
        return self.list_by_chapter(chapter.id)

    def delete_page_and_reindex(self, chapter: Chapter, page: ChapterPage) -> None:
        deleted_number = page.page_number
        self.db.delete(page)
        self.db.flush()

        # Lấy các trang phía sau và dồn lại số trang
        subsequent_pages = (
            self.db.scalars(
                select(ChapterPage)
                .where(
                    ChapterPage.chapter_id == chapter.id,
                    ChapterPage.page_number > deleted_number,
                )
                .order_by(ChapterPage.page_number.asc())
            )
            .all()
        )

        for p in subsequent_pages:
            p.page_number -= 1
            self.db.add(p)

        chapter.total_pages = max(0, chapter.total_pages - 1)
        if chapter.total_pages == 0:
            chapter.status = "draft"
        self.db.add(chapter)
        self.db.commit()

    def clear_all_pages(self, chapter: Chapter) -> list[str]:
        """Xoá toàn bộ trang và trả về danh sách đường dẫn file để xoá trên đĩa."""
        pages = self.list_by_chapter(chapter.id)
        file_paths = [p.file_path for p in pages]

        self.db.execute(delete(ChapterPage).where(ChapterPage.chapter_id == chapter.id))
        chapter.total_pages = 0
        chapter.status = "draft"
        self.db.add(chapter)
        self.db.commit()
        return file_paths
