import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings
from app.core.errors import UnauthorizedError

JWT_ALGORITHM = "HS256"

_hasher = PasswordHasher()
# Dùng khi không tìm thấy user, để thời gian phản hồi giống như khi sai mật khẩu.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


@dataclass(frozen=True)
class AccessClaims:
    user_id: int
    client: str
    session_version: int


def create_access_token(
    user_id: int,
    system_role: str,
    client: str,
    session_version: int,
    now: datetime | None = None,
) -> str:
    settings = get_settings()
    issued_at = now or datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": system_role,
        "cl": client,
        "sv": session_version,
        "type": "access",
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> AccessClaims:
    """Token sai hoặc hết hạn thì báo 401."""
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub", "cl", "sv"]},
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("invalid_token", "Token không hợp lệ hoặc đã hết hạn") from exc
    if payload.get("type") != "access":
        raise UnauthorizedError("invalid_token", "Token không hợp lệ hoặc đã hết hạn")
    return AccessClaims(
        user_id=int(payload["sub"]),
        client=str(payload["cl"]),
        session_version=int(payload["sv"]),
    )


def new_refresh_token() -> str:
    # Refresh token là chuỗi ngẫu nhiên (không phải JWT); DB chỉ lưu bản băm.
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
