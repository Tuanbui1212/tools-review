from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin

CHAPTER_STATUSES = ("draft", "ready", "processing", "completed", "error")


class Chapter(IdMixin, TimestampMixin, Base):
    __tablename__ = "chapters"
    __table_args__ = (
        CheckConstraint("chapter_number >= 1", name="ck_chapters_chapter_number_positive"),
        CheckConstraint(
            f"status IN {CHAPTER_STATUSES}",
            name="ck_chapters_status",
        ),
        Index(
            "uq_chapters_project_number_active",
            "project_id",
            "chapter_number",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_chapters_project_id", "project_id"),
        Index("ix_chapters_project_status", "project_id", "status"),
        Index("ix_chapters_deleted_at", "deleted_at"),
    )

    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(30),
        default="draft",
        server_default="draft",
        nullable=False,
    )
    total_pages: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    storage_dir: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project = relationship("Project", backref="chapters")
    created_by = relationship("User", foreign_keys=[created_by_id])
    pages = relationship(
        "ChapterPage",
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="ChapterPage.page_number",
    )


class ChapterPage(IdMixin, Base):
    __tablename__ = "chapter_pages"
    __table_args__ = (
        UniqueConstraint("chapter_id", "page_number", name="uq_chapter_pages_chapter_page"),
        CheckConstraint("page_number >= 1", name="ck_chapter_pages_page_number_positive"),
        Index("ix_chapter_pages_chapter_id", "chapter_id"),
        Index("ix_chapter_pages_file_hash", "file_hash"),
    )

    chapter_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    is_duplicate_hash: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    chapter = relationship("Chapter", back_populates="pages")
