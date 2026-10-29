"""session_version theo từng loại client: 1 phiên Web + 1 phiên App (D053)

Revision ID: 0002_session_per_client
Revises: 0001_users_auth
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_session_per_client"
down_revision: str | None = "0001_users_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "session_version", new_column_name="session_version_web")
    op.add_column(
        "users",
        sa.Column("session_version_app", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "session_version_app")
    op.alter_column("users", "session_version_web", new_column_name="session_version")
