"""Mỗi tài khoản chỉ có 1 phiên đăng nhập (D049)."""

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


def end_all_sessions(
    user: User, tokens: RefreshTokenRepository, now: datetime, reason: str
) -> None:
    """Đá mọi phiên của user ra ngay: huỷ refresh token và làm access token cũ hết hiệu lực."""
    user.session_version += 1
    tokens.revoke_all_for_user(user.id, now, reason)
