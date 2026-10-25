"""Nơi ráp các lớp: controller nhận service qua Depends, service nhận repository."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import MAX_PAGE_SIZE, PageParams
from app.services.auth_service import AuthService
from app.services.health_service import HealthService
from app.services.user_service import UserService

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False, description="Access token lấy từ /api/v1/auth/login")


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise UnauthorizedError("not_authenticated", "Chưa đăng nhập")
    claims = decode_access_token(credentials.credentials)
    user = UserRepository(db).get(claims.user_id)
    # Kiểm tra mỗi request: user bị khoá thì access token còn hạn cũng bị từ chối.
    if user is None or user.status != "active":
        raise UnauthorizedError("invalid_token", "Token không hợp lệ hoặc đã hết hạn")
    if claims.session_version != user.session_version:
        raise UnauthorizedError(
            "session_replaced", "Phiên đăng nhập đã kết thúc hoặc tài khoản đăng nhập ở nơi khác"
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str) -> Callable[[User], User]:
    def dependency(user: CurrentUser) -> User:
        if user.system_role not in roles:
            raise ForbiddenError("forbidden", "Không đủ quyền")
        return user

    return dependency


def get_page_params(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, description=f"Tối đa {MAX_PAGE_SIZE}")] = 20,
) -> PageParams:
    return PageParams(page=page, page_size=min(page_size, MAX_PAGE_SIZE))


def get_health_service(db: DbSession) -> HealthService:
    return HealthService(SystemRepository(db))


def get_auth_service(db: DbSession) -> AuthService:
    return AuthService(db, UserRepository(db), RefreshTokenRepository(db))


def get_user_service(db: DbSession) -> UserService:
    return UserService(db, UserRepository(db), RefreshTokenRepository(db))
