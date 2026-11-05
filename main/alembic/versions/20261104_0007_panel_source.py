"""Thêm cột source vào bảng chapter_panels (M05)

Revision ID: 0007_panel_source
Revises: 0006_chapter_panels
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_panel_source"
down_revision: str | None = "0006_chapter_panels"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "chapter_panels",
        sa.Column("source", sa.String(length=32), server_default="ai", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("chapter_panels", "source")

