from collections.abc import Sequence

from sqlalchemy import delete, select

from app.models.chapter_panel import ChapterPanel
from app.repositories.base import BaseRepository


class ChapterPanelRepository(BaseRepository[ChapterPanel]):
    model = ChapterPanel

    def get_by_id(self, panel_id: int) -> ChapterPanel | None:
        stmt = select(ChapterPanel).where(ChapterPanel.id == panel_id)
        return self.db.scalar(stmt)

    def list_by_chapter(self, chapter_id: int) -> Sequence[ChapterPanel]:
        stmt = (
            select(ChapterPanel)
            .where(ChapterPanel.chapter_id == chapter_id)
            .order_by(ChapterPanel.panel_number.asc())
        )
        return self.db.scalars(stmt).all()

    def list_by_page(self, page_id: int) -> Sequence[ChapterPanel]:
        stmt = (
            select(ChapterPanel)
            .where(ChapterPanel.chapter_page_id == page_id)
            .order_by(ChapterPanel.panel_index_in_page.asc())
        )
        return self.db.scalars(stmt).all()

    def delete_by_chapter(self, chapter_id: int) -> None:
        stmt = delete(ChapterPanel).where(ChapterPanel.chapter_id == chapter_id)
        self.db.execute(stmt)
        self.db.commit()

    def delete_by_page(self, page_id: int) -> None:
        stmt = delete(ChapterPanel).where(ChapterPanel.chapter_page_id == page_id)
        self.db.execute(stmt)
        self.db.commit()

    def save_batch_panels(self, chapter_id: int, panels: list[ChapterPanel]) -> list[ChapterPanel]:
        """Xoá toàn bộ panel cũ của chapter và lưu bộ mới."""
        self.db.execute(delete(ChapterPanel).where(ChapterPanel.chapter_id == chapter_id))
        for p in panels:
            self.db.add(p)
        self.db.commit()
        return list(self.list_by_chapter(chapter_id))

    def replace_page_panels(
        self,
        chapter_id: int,
        page_id: int,
        new_panels: list[ChapterPanel],
    ) -> Sequence[ChapterPanel]:
        """Cập nhật lại danh sách panel của 1 trang cụ thể và tái tính toán panel_number."""
        # 1. Xoá các panel cũ của trang
        self.db.execute(delete(ChapterPanel).where(ChapterPanel.chapter_page_id == page_id))
        self.db.flush()

        # 2. Thêm các panel mới
        for p in new_panels:
            self.db.add(p)
        self.db.flush()

        # 3. Đánh số lại panel_number xuyên suốt toàn bộ chapter theo thứ tự page và index_in_page
        all_panels = list(self.list_by_chapter(chapter_id))
        # Sắp xếp theo: page_id (hoặc trang) và panel_index_in_page
        for idx, panel in enumerate(all_panels, start=1):
            panel.panel_number = idx
            self.db.add(panel)
        self.db.commit()

        return self.list_by_page(page_id)

    def reorder_panels(self, chapter_id: int, panel_ids: list[int]) -> Sequence[ChapterPanel]:
        """Đánh lại số thứ tự panel_number theo mảng panel_ids do user chỉ định."""
        current_panels = {p.id: p for p in self.list_by_chapter(chapter_id)}
        if set(panel_ids) != set(current_panels.keys()):
            raise ValueError("Danh sách panel_ids không khớp với danh sách panel của chapter")

        # Đổi tạm thời sang số lớn để tránh đụng độ
        for p in current_panels.values():
            p.panel_number = 1_000_000 + p.id
            self.db.add(p)
        self.db.flush()

        # Gán lại chuẩn từ 1 đến N
        for idx, pid in enumerate(panel_ids, start=1):
            p = current_panels[pid]
            p.panel_number = idx
            self.db.add(p)

        self.db.commit()
        return self.list_by_chapter(chapter_id)

