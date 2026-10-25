from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PageParams
from app.schemas.user import UserCreate, UserFilters, UserUpdate
from app.services.session_policy import end_all_sessions
from app.services.user_policy import UserPolicy


class UserService:
    def __init__(self, db: Session, users: UserRepository, tokens: RefreshTokenRepository) -> None:
        self.db = db
        self.users = users
        self.tokens = tokens

    def create_user(self, actor: User, data: UserCreate) -> User:
        if data.system_role not in UserPolicy.creatable_roles(actor):
            raise ForbiddenError(
                "forbidden_role", f"Không có quyền tạo tài khoản {data.system_role}"
            )
        return self._create(data, created_by=actor.id)

    def bootstrap_admin(self, data: UserCreate) -> User:
        """Tạo admin đầu tiên từ CLI, không cần người thao tác."""
        return self._create(data.model_copy(update={"system_role": "admin"}), created_by=None)

    def list_users(
        self, actor: User, filters: UserFilters, page: PageParams
    ) -> tuple[Sequence[User], int]:
        return self.users.search(
            visible_roles=UserPolicy.visible_roles(actor),
            include_id=actor.id,
            system_role=filters.system_role,
            status=filters.status,
            query=filters.q,
            offset=page.offset,
            limit=page.page_size,
        )

    def get_user(self, actor: User, user_id: int) -> User:
        return self._get_visible(actor, user_id)

    def update_user(self, actor: User, user_id: int, data: UserUpdate) -> User:
        target = self._get_visible(actor, user_id)
        changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if actor.id == target.id:
            if set(changes) - {"display_name"}:
                raise ForbiddenError("forbidden", "Chỉ được sửa tên hiển thị của chính mình")
        elif not UserPolicy.can_manage(actor, target):
            raise ForbiddenError("forbidden", "Không có quyền sửa user này")

        if "email" in changes and changes["email"] != target.email:
            self._ensure_unique(email=changes["email"])
        for field, value in changes.items():
            setattr(target, field, value)
        self._commit()
        return target

    def lock_user(self, actor: User, user_id: int) -> User:
        target = self._get_visible(actor, user_id)
        if target.id == actor.id:
            raise BadRequestError("cannot_lock_self", "Không thể tự khoá tài khoản của mình")
        self._ensure_manageable(actor, target)
        if target.system_role == "admin" and self.users.count_active_admins(target.id) == 0:
            raise BadRequestError("last_admin", "Không thể khoá admin cuối cùng")

        target.status = "locked"
        end_all_sessions(target, self.tokens, datetime.now(UTC), "locked")
        self._commit()
        return target

    def unlock_user(self, actor: User, user_id: int) -> User:
        target = self._get_visible(actor, user_id)
        self._ensure_manageable(actor, target)
        target.status = "active"
        target.failed_login_count = 0
        target.login_locked_until = None
        self._commit()
        return target

    def reset_password(self, actor: User, user_id: int, new_password: str) -> None:
        target = self._get_visible(actor, user_id)
        if target.id == actor.id:
            raise BadRequestError(
                "use_change_password", "Đổi mật khẩu của chính mình qua /auth/change-password"
            )
        self._ensure_manageable(actor, target)
        target.password_hash = hash_password(new_password)
        target.failed_login_count = 0
        target.login_locked_until = None
        end_all_sessions(target, self.tokens, datetime.now(UTC), "password_reset")
        self._commit()

    def _create(self, data: UserCreate, created_by: int | None) -> User:
        self._ensure_unique(email=data.email, username=data.username)
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            display_name=data.display_name,
            system_role=data.system_role,
            status="active",
            failed_login_count=0,
            created_by=created_by,
        )
        self.users.add(user)
        self._commit()
        return user

    def _get_visible(self, actor: User, user_id: int) -> User:
        # Không thấy thì báo 404 như không tồn tại, để không lộ việc user có hay không.
        target = self.users.get(user_id)
        if target is None or not UserPolicy.can_view(actor, target):
            raise NotFoundError("user_not_found", "Không tìm thấy user")
        return target

    @staticmethod
    def _ensure_manageable(actor: User, target: User) -> None:
        if not UserPolicy.can_manage(actor, target):
            raise ForbiddenError("forbidden", "Không có quyền quản lý user này")

    def _ensure_unique(self, *, email: str | None = None, username: str | None = None) -> None:
        if email is not None and self.users.get_by_email(email) is not None:
            raise ConflictError("email_taken", "Email đã được dùng")
        if username is not None and self.users.get_by_username(username) is not None:
            raise ConflictError("username_taken", "Username đã được dùng")

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("conflict", "Dữ liệu bị trùng") from exc
