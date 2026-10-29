from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.project import ProjectInvitation
from app.repositories.base import BaseRepository


class ProjectInvitationRepository(BaseRepository[ProjectInvitation]):
    model = ProjectInvitation

    def get_with_details(self, invitation_id: int) -> ProjectInvitation | None:
        stmt = (
            select(ProjectInvitation)
            .where(ProjectInvitation.id == invitation_id)
            .options(
                joinedload(ProjectInvitation.project),
                joinedload(ProjectInvitation.invitee),
                joinedload(ProjectInvitation.inviter),
            )
        )
        return self.db.scalar(stmt)

    def get_pending(self, project_id: int, invitee_user_id: int) -> ProjectInvitation | None:
        stmt = select(ProjectInvitation).where(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.invitee_user_id == invitee_user_id,
            ProjectInvitation.status == "pending",
        )
        return self.db.scalar(stmt)

    def list_by_invitee(self, user_id: int) -> Sequence[ProjectInvitation]:
        stmt = (
            select(ProjectInvitation)
            .where(
                ProjectInvitation.invitee_user_id == user_id,
                ProjectInvitation.status == "pending",
            )
            .options(
                joinedload(ProjectInvitation.project),
                joinedload(ProjectInvitation.inviter),
            )
            .order_by(ProjectInvitation.created_at.desc())
        )
        return self.db.scalars(stmt).all()

    def list_by_project(self, project_id: int) -> Sequence[ProjectInvitation]:
        stmt = (
            select(ProjectInvitation)
            .where(
                ProjectInvitation.project_id == project_id,
                ProjectInvitation.status == "pending",
            )
            .options(
                joinedload(ProjectInvitation.invitee),
                joinedload(ProjectInvitation.inviter),
            )
            .order_by(ProjectInvitation.created_at.desc())
        )
        return self.db.scalars(stmt).all()
