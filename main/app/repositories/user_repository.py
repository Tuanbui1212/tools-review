from collections.abc import Sequence

from sqlalchemy import func, or_, select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username))

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_by_login(self, identifier: str) -> User | None:
        """Tìm theo username hoặc email (đều lưu dạng chữ thường)."""
        value = identifier.strip().lower()
        return self.db.scalar(select(User).where(or_(User.username == value, User.email == value)))

    def search(
        self,
        *,
        visible_roles: set[str] | None,
        include_id: int | None,
        system_role: str | None,
        status: str | None,
        query: str | None,
        offset: int,
        limit: int,
    ) -> tuple[Sequence[User], int]:
        """visible_roles=None nghĩa là thấy mọi role; include_id luôn thấy (chính mình)."""
        stmt = select(User)
        if visible_roles is not None:
            condition = User.system_role.in_(visible_roles)
            if include_id is not None:
                condition = or_(condition, User.id == include_id)
            stmt = stmt.where(condition)
        if system_role:
            stmt = stmt.where(User.system_role == system_role)
        if status:
            stmt = stmt.where(User.status == status)
        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    User.username.ilike(pattern),
                    User.email.ilike(pattern),
                    User.display_name.ilike(pattern),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = self.db.scalars(stmt.order_by(User.id).offset(offset).limit(limit)).all()
        return items, total

    def count_active_admins(self, exclude_id: int | None = None) -> int:
        stmt = select(func.count()).where(User.system_role == "admin", User.status == "active")
        if exclude_id is not None:
            stmt = stmt.where(User.id != exclude_id)
        return self.db.scalar(stmt) or 0
