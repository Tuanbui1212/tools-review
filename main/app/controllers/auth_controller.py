from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, get_auth_service
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenPair,
)
from app.schemas.user import UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, service: AuthServiceDep) -> TokenPair:
    return service.login(body.identifier, body.password, body.client, body.device_name)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, service: AuthServiceDep) -> TokenPair:
    return service.refresh(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest, user: CurrentUser, service: AuthServiceDep) -> None:
    service.logout(user, body.refresh_token)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/change-password", response_model=TokenPair)
def change_password(
    body: ChangePasswordRequest, user: CurrentUser, service: AuthServiceDep
) -> TokenPair:
    return service.change_password(
        user, body.current_password, body.new_password, body.client, body.device_name
    )
