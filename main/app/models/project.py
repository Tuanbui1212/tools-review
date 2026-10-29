from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, IdMixin, TimestampMixin

COMIC_TYPES = ("manga", "manhwa", "manhua", "webtoon", "comic", "vn")
READING_DIRECTIONS = ("rtl", "ltr", "ttb")
AUTOMATION_LEVELS = ("full_auto", "review_script", "review_all")
PROJECT_ROLES = ("owner", "member")
INVITATION_STATUSES = ("pending", "accepted", "declined", "revoked")

# Dùng JSONB trên Postgres, JSON trên các DB khác (SQLite cho unit test)
JsonType = JSON().with_variant(JSONB(), "postgresql")


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            f"comic_type IN {COMIC_TYPES}",
            name="comic_type_check",
        ),
        CheckConstraint(
            f"reading_direction IN {READING_DIRECTIONS}",
            name="reading_direction_check",
        ),
        CheckConstraint(
            f"automation_level IN {AUTOMATION_LEVELS}",
            name="automation_level_check",
        ),
        Index("ix_projects_owner_id", "owner_id"),
        Index("ix_projects_deleted_at", "deleted_at"),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"))
    comic_type: Mapped[str] = mapped_column(Text, default="manga", server_default="manga")
    reading_direction: Mapped[str] = mapped_column(Text, default="rtl", server_default="rtl")
    source_lang: Mapped[str] = mapped_column(Text, default="ja", server_default="ja")
    target_lang: Mapped[str] = mapped_column(Text, default="vi", server_default="vi")
    genre: Mapped[list[str]] = mapped_column(JsonType, default=list, server_default="[]")
    automation_level: Mapped[str] = mapped_column(
        Text, default="review_script", server_default="review_script"
    )
    settings: Mapped[dict] = mapped_column(JsonType, default=dict, server_default="{}")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        CheckConstraint(
            f"role IN {PROJECT_ROLES}",
            name="project_member_role_check",
        ),
        Index("ix_project_members_user_id", "user_id"),
    )

    project_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(Text, default="member", server_default="member")
    invited_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    project = relationship("Project", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])


class ProjectInvitation(IdMixin, Base):
    __tablename__ = "project_invitations"
    __table_args__ = (
        CheckConstraint(
            f"status IN {INVITATION_STATUSES}",
            name="invitation_status_check",
        ),
        Index("ix_project_invitations_invitee", "invitee_user_id"),
        Index("ix_project_invitations_project", "project_id"),
    )

    project_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    invitee_user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    invited_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, default="pending", server_default="pending")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project = relationship("Project")
    invitee = relationship("User", foreign_keys=[invitee_user_id])
    inviter = relationship("User", foreign_keys=[invited_by])
