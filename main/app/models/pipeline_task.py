from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PipelineTask(Base):
    """Bảng quản lý tiến trình nhiệm vụ chạy nền qua Celery Worker (Module 04)."""

    __tablename__ = "pipeline_tasks"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    project_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chapter_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True, index=True
    )

    task_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    queue_name: Mapped[str] = mapped_column(String(32), nullable=False, default="io_queue")
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", index=True
    )  # pending, processing, completed, failed, cancelled
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stage_message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    project = relationship("Project", backref="pipeline_tasks")
    chapter = relationship("Chapter", backref="pipeline_tasks")
    creator = relationship("User", backref="pipeline_tasks")

    __table_args__ = (
        Index("ix_pipeline_tasks_project_status", "project_id", "status"),
        Index("ix_pipeline_tasks_chapter_type", "chapter_id", "task_type"),
    )
