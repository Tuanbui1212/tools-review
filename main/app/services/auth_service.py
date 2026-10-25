from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BadRequestError, UnauthorizedError
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_dummy_password,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenPair
from app.services.session_policy import REVOKED_ERRORS, end_all_sessions

_INVALID_CREDENTIALS = ("invalid_credentials", "Sai tên đăng nhập hoặc mật khẩu")


class AuthService:
    def __init__(self, db: Session, users: UserRepository, tokens: RefreshTokenRepository) -> None:
        self.db = db
        self.users = users
        self.tokens = tokens

    def login(
        self, identifier: str, password: str, client: str, device_name: str | None
    ) -> TokenPair:
        settings = get_settings()
        now = datetime.now(UTC)
        user = self.users.get_by_login(identifier)
        if user is None:
            verify_dummy_password(password)
            raise UnauthorizedError(*_INVALID_CREDENTIALS)

        if user.login_locked_until and user.login_locked_until > now:
            retry_after = int((user.login_locked_until - now).total_seconds()) + 1
            raise UnauthorizedError(
                "login_temporarily_locked",
                "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau",
                {"retry_after_seconds": retry_after},
            )

        if not verify_password(password, user.password_hash):
            user.failed_login_count += 1
            if user.failed_login_count >= settings.login_max_failed:
                user.login_locked_until = now + timedelta(minutes=settings.login_lock_minutes)
                user.failed_login_count = 0
            self.db.commit()
            raise UnauthorizedError(*_INVALID_CREDENTIALS)

        if user.status != "active":
            raise UnauthorizedError("user_locked", "Tài khoản đã bị khoá")

        user.failed_login_count = 0
        user.login_locked_until = None
        user.last_login_at = now
        # Đăng nhập mới đá thiết bị đang đăng nhập trước đó ra (D049).
        end_all_sessions(user, self.tokens, now, "new_login")
        pair, _ = self._issue_tokens(user, client, device_name, now)
        self.db.commit()
        return pair

    def refresh(self, raw_token: str) -> TokenPair:
        now = datetime.now(UTC)
        current = self.tokens.get_by_hash(hash_token(raw_token))
        if current is None:
            raise UnauthorizedError("invalid_refresh_token", "Refresh token không hợp lệ")

        if current.revoked_at is not None:
            if current.revoked_reason == "rotated":
                # Token đã đổi sang token mới mà vẫn bị dùng lại: coi như bị lộ,
                # đá mọi phiên của user ra.
                user = self.users.get(current.user_id)
                if user is not None:
                    end_all_sessions(user, self.tokens, now, "reuse_detected")
                    self.db.commit()
                raise UnauthorizedError(*REVOKED_ERRORS["reuse_detected"])
            raise UnauthorizedError(
                *REVOKED_ERRORS.get(current.revoked_reason or "logout", REVOKED_ERRORS["logout"])
            )
        if current.expires_at <= now:
            raise UnauthorizedError("refresh_token_expired", "Phiên đăng nhập đã hết hạn")

        user = self.users.get(current.user_id)
        if user is None or user.status != "active":
            raise UnauthorizedError(*REVOKED_ERRORS["locked"])

        pair, replacement = self._issue_tokens(user, current.client, current.device_name, now)
        current.revoked_at = now
        current.revoked_reason = "rotated"
        current.replaced_by_id = replacement.id
        self.db.commit()
        return pair

    def logout(self, user: User, raw_token: str) -> None:
        token = self.tokens.get_by_hash(hash_token(raw_token))
        if token is not None and token.user_id == user.id and token.revoked_at is None:
            end_all_sessions(user, self.tokens, datetime.now(UTC), "logout")
            self.db.commit()

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        client: str,
        device_name: str | None,
    ) -> TokenPair:
        if not verify_password(current_password, user.password_hash):
            raise BadRequestError("invalid_current_password", "Mật khẩu hiện tại không đúng")
        now = datetime.now(UTC)
        user.password_hash = hash_password(new_password)
        end_all_sessions(user, self.tokens, now, "password_changed")
        pair, _ = self._issue_tokens(user, client, device_name, now)
        self.db.commit()
        return pair

    def _issue_tokens(
        self, user: User, client: str, device_name: str | None, now: datetime
    ) -> tuple[TokenPair, RefreshToken]:
        settings = get_settings()
        raw = new_refresh_token()
        record = self.tokens.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                client=client,
                device_name=device_name,
                expires_at=now + timedelta(days=settings.refresh_token_days),
            )
        )
        pair = TokenPair(
            access_token=create_access_token(user.id, user.system_role, user.session_version, now),
            refresh_token=raw,
            expires_in=settings.access_token_minutes * 60,
        )
        return pair, record
