from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin


class RefreshToken(IdMixin, Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        CheckConstraint("client IN ('web', 'app')", name="client"),
        CheckConstraint(
            "revoked_reason IN ('rotated', 'logout', 'new_login', 'password_changed', "
            "'password_reset', 'locked', 'reuse_detected')",
            name="revoked_reason",
        ),
    )

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(Text, unique=True)
    client: Mapped[str] = mapped_column(Text)
    device_name: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Lý do bị huỷ (rotated, logout, new_login…); dùng để báo đúng lỗi cho thiết bị cũ.
    revoked_reason: Mapped[str | None] = mapped_column(Text)
    replaced_by_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("refresh_tokens.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
