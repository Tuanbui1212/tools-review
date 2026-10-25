from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

SystemRole = Literal["admin", "root", "sub"]
UserStatus = Literal["active", "locked"]

Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^[A-Za-z0-9_.-]{3,32}$"),
]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


def _lower_email(value: str | None) -> str | None:
    return value.lower() if value else value


class UserCreate(BaseModel):
    email: EmailStr
    username: Username
    password: Password
    display_name: DisplayName | None = None
    system_role: SystemRole

    _normalize_email = field_validator("email")(_lower_email)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    display_name: DisplayName | None = None

    _normalize_email = field_validator("email")(_lower_email)


class ResetPasswordRequest(BaseModel):
    new_password: Password


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    display_name: str | None
    system_role: SystemRole
    status: UserStatus
    created_by: int | None
    last_login_at: datetime | None
    created_at: datetime


class UserFilters(BaseModel):
    system_role: SystemRole | None = None
    status: UserStatus | None = None
    q: str | None = Field(default=None, max_length=100)
