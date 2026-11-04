from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin


class ChapterPanel(IdMixin, TimestampMixin, Base):
    __tablename__ = "chapter_panels"
    __table_args__ = (
        CheckConstraint("bbox_width > 0", name="ck_chapter_panels_bbox_width_positive"),
        CheckConstraint("bbox_height > 0", name="ck_chapter_panels_bbox_height_positive"),
        CheckConstraint("panel_number >= 1", name="ck_chapter_panels_panel_number_positive"),
        CheckConstraint("panel_index_in_page >= 1", name="ck_chapter_panels_panel_index_positive"),
        Index("ix_chapter_panels_chapter_id", "chapter_id"),
        Index("ix_chapter_panels_chapter_page_id", "chapter_page_id"),
        Index("ix_chapter_panels_chapter_and_number", "chapter_id", "panel_number"),
    )

    chapter_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
    )
    chapter_page_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("chapter_pages.id", ondelete="CASCADE"),
        nullable=False,
    )
    panel_number: Mapped[int] = mapped_column(Integer, nullable=False)
    panel_index_in_page: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_x: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_y: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_width: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_height: Mapped[int] = mapped_column(Integer, nullable=False)
    image_path: Mapped[str | None] = mapped_column(Text)
    google_drive_file_id: Mapped[str | None] = mapped_column(String(128))
    is_full_page: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )

    chapter = relationship("Chapter", backref="panels")
    page = relationship("ChapterPage", backref="panels")

