from collections.abc import Sequence

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.models.project import Project, ProjectMember
from app.models.user import User
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model = Project

    def get_with_details(self, project_id: int) -> Project | None:
        stmt = (
            select(Project)
            .where(Project.id == project_id)
            .options(
                joinedload(Project.owner),
                selectinload(Project.members).joinedload(ProjectMember.user),
            )
        )
        return self.db.scalar(stmt)

    def _visibility_condition(self, actor: User):
        """Điều kiện lọc quyền xem project theo D007, D011, D012, D021."""
        if actor.system_role == "admin":
            return None

        # Project actor là thành viên hoặc là owner
        is_member = Project.id.in_(
            select(ProjectMember.project_id).where(ProjectMember.user_id == actor.id)
        )
        is_owner = Project.owner_id == actor.id

        if actor.system_role == "root":
            # Root thấy project mình tham gia + project có owner là sub
            sub_owner = Project.owner_id.in_(select(User.id).where(User.system_role == "sub"))
            return or_(is_member, is_owner, sub_owner)

        # Sub chỉ thấy project mình là thành viên hoặc owner
        return or_(is_member, is_owner)

    def search(
        self,
        actor: User,
        *,
        comic_type: str | None,
        query: str | None,
        include_archived: bool,
        offset: int,
        limit: int,
    ) -> tuple[Sequence[Project], int]:
        stmt = select(Project).options(
            joinedload(Project.owner),
            selectinload(Project.members),
        )

        vis = self._visibility_condition(actor)
        if vis is not None:
            stmt = stmt.where(vis)

        if not include_archived:
            stmt = stmt.where(Project.deleted_at.is_(None))

        if comic_type:
            stmt = stmt.where(Project.comic_type == comic_type)

        if query:
            stmt = stmt.where(Project.name.ilike(f"%{query.strip()}%"))

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = (
            self.db.scalars(stmt.order_by(Project.created_at.desc()).offset(offset).limit(limit))
            .unique()
            .all()
        )
        return items, total

    def get_stats(self, actor: User) -> tuple[int, int, int]:
        """Trả về (total, active, archived) theo đúng quyền xem."""
        stmt = select(
            func.count(Project.id).label("total"),
            func.count(case((Project.deleted_at.is_(None), Project.id))).label("active"),
            func.count(case((Project.deleted_at.is_not(None), Project.id))).label("archived"),
        )
        vis = self._visibility_condition(actor)
        if vis is not None:
            stmt = stmt.where(vis)

        row = self.db.execute(stmt).one()
        return row.total or 0, row.active or 0, row.archived or 0
