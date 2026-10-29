"""Tạo bảng chapters và chapter_pages (M03)

Revision ID: 0004_chapters_and_pages
Revises: 0003_projects_members
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_chapters_and_pages"
down_revision: str | None = "0003_projects_members"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Bảng chapters
    op.create_table(
        "chapters",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.BigInteger(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chapter_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), server_default="draft", nullable=False),
        sa.Column("total_pages", sa.Integer(), server_default="0", nullable=False),
        sa.Column("storage_dir", sa.Text(), nullable=True),
        sa.Column(
            "created_by_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            "chapter_number >= 1",
            name="ck_chapters_chapter_number_positive",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'ready', 'processing', 'completed', 'error')",
            name="ck_chapters_status",
        ),
    )

    # Unique index cho chapter_number trong cùng project khi chưa bị xoá mềm
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.create_index(
            "uq_chapters_project_number_active",
            "chapters",
            ["project_id", "chapter_number"],
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
        )
    else:
        op.create_index(
            "uq_chapters_project_number_active",
            "chapters",
            ["project_id", "chapter_number"],
            unique=True,
        )

    op.create_index("ix_chapters_project_status", "chapters", ["project_id", "status"])
    op.create_index("ix_chapters_project_id", "chapters", ["project_id"])
    op.create_index("ix_chapters_deleted_at", "chapters", ["deleted_at"])

    # 2. Bảng chapter_pages
    op.create_table(
        "chapter_pages",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "chapter_id",
            sa.BigInteger(),
            sa.ForeignKey("chapters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(50), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column(
            "is_duplicate_hash",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "chapter_id",
            "page_number",
            name="uq_chapter_pages_chapter_page",
        ),
        sa.CheckConstraint(
            "page_number >= 1",
            name="ck_chapter_pages_page_number_positive",
        ),
    )

    op.create_index("ix_chapter_pages_chapter_id", "chapter_pages", ["chapter_id"])
    op.create_index("ix_chapter_pages_file_hash", "chapter_pages", ["file_hash"])


def downgrade() -> None:
    op.drop_table("chapter_pages")
    op.drop_table("chapters")
