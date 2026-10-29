"""Tạo bảng projects, project_members, project_invitations (M02)

Revision ID: 0003_projects_members
Revises: 0002_session_per_client
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0003_projects_members"
down_revision: str | None = "0002_session_per_client"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

json_type = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "owner_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("comic_type", sa.Text(), server_default="manga", nullable=False),
        sa.Column("reading_direction", sa.Text(), server_default="rtl", nullable=False),
        sa.Column("source_lang", sa.Text(), server_default="ja", nullable=False),
        sa.Column("target_lang", sa.Text(), server_default="vi", nullable=False),
        sa.Column("genre", json_type, server_default="[]", nullable=False),
        sa.Column("automation_level", sa.Text(), server_default="review_script", nullable=False),
        sa.Column("settings", json_type, server_default="{}", nullable=False),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "comic_type IN ('manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'vn')",
            name="ck_projects_comic_type",
        ),
        sa.CheckConstraint(
            "reading_direction IN ('rtl', 'ltr', 'ttb')",
            name="ck_projects_reading_direction",
        ),
        sa.CheckConstraint(
            "automation_level IN ('full_auto', 'review_script', 'review_all')",
            name="ck_projects_automation_level",
        ),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_index("ix_projects_deleted_at", "projects", ["deleted_at"])

    op.create_table(
        "project_members",
        sa.Column(
            "project_id",
            sa.BigInteger(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.Text(), server_default="member", nullable=False),
        sa.Column(
            "invited_by",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("role IN ('owner', 'member')", name="ck_project_members_role"),
    )
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])

    op.create_table(
        "project_invitations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.BigInteger(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invitee_user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invited_by",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'declined', 'revoked')",
            name="ck_project_invitations_status",
        ),
    )
    op.create_index(
        "ix_project_invitations_invitee",
        "project_invitations",
        ["invitee_user_id"],
    )
    op.create_index(
        "ix_project_invitations_project",
        "project_invitations",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_table("project_invitations")
    op.drop_table("project_members")
    op.drop_table("projects")
