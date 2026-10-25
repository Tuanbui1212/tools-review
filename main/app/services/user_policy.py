"""Quy tắc ai được tạo / xem / quản lý user nào (M01 spec 5.1)."""

from app.models.user import User

_CREATABLE_ROLES: dict[str, set[str]] = {
    "admin": {"admin", "root", "sub"},
    "root": {"sub"},
    "sub": set(),
}

# None = thấy mọi role. Ngoài ra ai cũng luôn thấy chính mình.
_VISIBLE_ROLES: dict[str, set[str] | None] = {
    "admin": None,
    "root": {"sub"},
    "sub": set(),
}


class UserPolicy:
    @staticmethod
    def creatable_roles(actor: User) -> set[str]:
        return _CREATABLE_ROLES.get(actor.system_role, set())

    @staticmethod
    def visible_roles(actor: User) -> set[str] | None:
        return _VISIBLE_ROLES.get(actor.system_role, set())

    @classmethod
    def can_view(cls, actor: User, target: User) -> bool:
        if actor.id == target.id:
            return True
        roles = cls.visible_roles(actor)
        return roles is None or target.system_role in roles

    @staticmethod
    def can_manage(actor: User, target: User) -> bool:
        """Khoá / mở khoá / đặt lại mật khẩu / sửa email. Không ai tự quản lý chính mình."""
        if actor.id == target.id:
            return False
        if actor.system_role == "admin":
            return True
        return actor.system_role == "root" and target.system_role == "sub"
