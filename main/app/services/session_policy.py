"""Mỗi tài khoản: 1 phiên Web + 1 phiên App; Web và App không đá nhau (D049, D053)."""

from datetime import datetime

from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository

# Lý do huỷ refresh token → mã lỗi trả cho thiết bị cũ khi nó thử refresh.
REVOKED_ERRORS: dict[str, tuple[str, str]] = {
    "new_login": ("session_replaced", "Tài khoản đã đăng nhập ở thiết bị khác"),
    "logout": ("refresh_token_revoked", "Phiên đăng nhập đã kết thúc"),
    "password_changed": ("refresh_token_revoked", "Mật khẩu đã được đổi, vui lòng đăng nhập lại"),
    "password_reset": ("refresh_token_revoked", "Mật khẩu đã được đặt lại, vui lòng đăng nhập lại"),
    "locked": ("user_locked", "Tài khoản đã bị khoá"),
    "reuse_detected": ("refresh_token_reused", "Phiên đăng nhập không còn hợp lệ"),
}


def end_client_session(
    user: User, tokens: RefreshTokenRepository, client: str, now: datetime, reason: str
) -> None:
    """Đá phiên của một loại client (web hoặc app) ra ngay; phiên loại còn lại giữ nguyên."""
    user.bump_session(client)
    tokens.revoke_all_for_user(user.id, now, reason, client=client)


def end_all_sessions(
    user: User, tokens: RefreshTokenRepository, now: datetime, reason: str
) -> None:
    """Đá mọi phiên của user ra ngay (đổi / đặt lại mật khẩu, bị khoá, token bị lộ)."""
    user.bump_session()
    tokens.revoke_all_for_user(user.id, now, reason)
