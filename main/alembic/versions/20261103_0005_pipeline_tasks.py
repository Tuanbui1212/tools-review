"""Tạo bảng pipeline_tasks (M04)

Revision ID: 0005_pipeline_tasks
Revises: 0004_chapters_and_pages
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0005_pipeline_tasks"
down_revision: str | None = "0004_chapters_and_pages"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pipeline_tasks",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("task_id", sa.String(64), nullable=False),
        sa.Column(
            "project_id",
            sa.BigInteger(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chapter_id",
            sa.BigInteger(),
            sa.ForeignKey("chapters.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("task_type", sa.String(64), nullable=False),
        sa.Column("queue_name", sa.String(32), server_default="io_queue", nullable=False),
        sa.Column("status", sa.String(32), server_default="pending", nullable=False),
        sa.Column("progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("stage_message", sa.String(255), nullable=True),
        sa.Column("payload", JSONB(), nullable=True),
        sa.Column("result", JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("ix_pipeline_tasks_task_id", "pipeline_tasks", ["task_id"], unique=True)
    op.create_index("ix_pipeline_tasks_project_id", "pipeline_tasks", ["project_id"])
    op.create_index("ix_pipeline_tasks_chapter_id", "pipeline_tasks", ["chapter_id"])
    op.create_index("ix_pipeline_tasks_task_type", "pipeline_tasks", ["task_type"])
    op.create_index("ix_pipeline_tasks_status", "pipeline_tasks", ["status"])
    op.create_index(
        "ix_pipeline_tasks_project_status", "pipeline_tasks", ["project_id", "status"]
    )
    op.create_index(
        "ix_pipeline_tasks_chapter_type", "pipeline_tasks", ["chapter_id", "task_type"]
    )


def downgrade() -> None:
    op.drop_index("ix_pipeline_tasks_chapter_type", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_project_status", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_status", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_task_type", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_chapter_id", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_project_id", table_name="pipeline_tasks")
    op.drop_index("ix_pipeline_tasks_task_id", table_name="pipeline_tasks")
    op.drop_table("pipeline_tasks")
