from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.models.project import ProjectMember
from app.repositories.base import BaseRepository


class ProjectMemberRepository(BaseRepository[ProjectMember]):
    model = ProjectMember

    def get_membership(self, project_id: int, user_id: int) -> ProjectMember | None:
        return self.db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        )

    def list_by_project(self, project_id: int) -> Sequence[ProjectMember]:
        stmt = (
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id)
            .options(joinedload(ProjectMember.user))
            .order_by(ProjectMember.joined_at.asc())
        )
        return self.db.scalars(stmt).all()

    def count_by_project(self, project_id: int) -> int:
        return (
            self.db.scalar(select(func.count()).where(ProjectMember.project_id == project_id)) or 0
        )

    def count_owners(self, project_id: int) -> int:
        return (
            self.db.scalar(
                select(func.count()).where(
                    ProjectMember.project_id == project_id,
                    ProjectMember.role == "owner",
                )
            )
            or 0
        )
