"""Thêm cột polygon_points vào bảng chapter_panels (M05)

Revision ID: 0008_panel_polygon
Revises: 0007_panel_source
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_panel_polygon"
down_revision: str | None = "0007_panel_source"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "chapter_panels",
        sa.Column("polygon_points", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chapter_panels", "polygon_points")

