"""Tạo bảng chapter_panels (M05)

Revision ID: 0006_chapter_panels
Revises: 0005_pipeline_tasks
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_chapter_panels"
down_revision: str | None = "0005_pipeline_tasks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "chapter_panels",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "chapter_id",
            sa.BigInteger(),
            sa.ForeignKey("chapters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chapter_page_id",
            sa.BigInteger(),
            sa.ForeignKey("chapter_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("panel_number", sa.Integer(), nullable=False),
        sa.Column("panel_index_in_page", sa.Integer(), nullable=False),
        sa.Column("bbox_x", sa.Integer(), nullable=False),
        sa.Column("bbox_y", sa.Integer(), nullable=False),
        sa.Column("bbox_width", sa.Integer(), nullable=False),
        sa.Column("bbox_height", sa.Integer(), nullable=False),
        sa.Column("image_path", sa.Text(), nullable=True),
        sa.Column("google_drive_file_id", sa.String(128), nullable=True),
        sa.Column(
            "is_full_page",
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
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("bbox_width > 0", name="ck_chapter_panels_bbox_width_positive"),
        sa.CheckConstraint("bbox_height > 0", name="ck_chapter_panels_bbox_height_positive"),
        sa.CheckConstraint("panel_number >= 1", name="ck_chapter_panels_panel_number_positive"),
        sa.CheckConstraint("panel_index_in_page >= 1", name="ck_chapter_panels_panel_index_positive"),
    )

    op.create_index(
        "ix_chapter_panels_chapter_id",
        "chapter_panels",
        ["chapter_id"],
    )
    op.create_index(
        "ix_chapter_panels_chapter_page_id",
        "chapter_panels",
        ["chapter_page_id"],
    )
    op.create_index(
        "ix_chapter_panels_chapter_and_number",
        "chapter_panels",
        ["chapter_id", "panel_number"],
    )


def downgrade() -> None:
    op.drop_index("ix_chapter_panels_chapter_and_number", table_name="chapter_panels")
    op.drop_index("ix_chapter_panels_chapter_page_id", table_name="chapter_panels")
    op.drop_index("ix_chapter_panels_chapter_id", table_name="chapter_panels")
    op.drop_table("chapter_panels")

