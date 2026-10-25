from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.user import Password

Client = Literal["web", "app"]


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=320, description="Username hoặc email")
    password: str = Field(min_length=1, max_length=128)
    client: Client = "web"
    device_name: str | None = Field(default=None, max_length=100)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password
    client: Client = "web"
    device_name: str | None = Field(default=None, max_length=100)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Số giây access token còn hiệu lực")
