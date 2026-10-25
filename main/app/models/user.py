from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin

SYSTEM_ROLES = ("admin", "root", "sub")
USER_STATUSES = ("active", "locked")


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("system_role IN ('admin', 'root', 'sub')", name="system_role"),
        CheckConstraint("status IN ('active', 'locked')", name="status"),
    )

    email: Mapped[str] = mapped_column(Text, unique=True)
    username: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str | None] = mapped_column(Text)
    system_role: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="active", server_default="active")
    created_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    login_locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Tăng mỗi lần đăng nhập / đổi mật khẩu / bị khoá. Access token mang số này; lệch là bị
    # từ chối ngay → mỗi tài khoản chỉ có 1 phiên đăng nhập (D049).
    session_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
