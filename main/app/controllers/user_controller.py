from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUser, get_page_params, get_user_service, require_roles
from app.models.user import User
from app.schemas.common import Page, PageParams
from app.schemas.user import ResetPasswordRequest, UserCreate, UserFilters, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

UserServiceDep = Annotated[UserService, Depends(get_user_service)]
ManagerUser = Annotated[User, Depends(require_roles("admin", "root"))]


@router.get("", response_model=Page[UserRead])
def list_users(
    actor: ManagerUser,
    service: UserServiceDep,
    page: Annotated[PageParams, Depends(get_page_params)],
    filters: Annotated[UserFilters, Query()],
) -> Page[UserRead]:
    items, total = service.list_users(actor, filters, page)
    return Page[UserRead](
        items=[UserRead.model_validate(user) for user in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, actor: ManagerUser, service: UserServiceDep) -> UserRead:
    return UserRead.model_validate(service.create_user(actor, body))


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, actor: CurrentUser, service: UserServiceDep) -> UserRead:
    return UserRead.model_validate(service.get_user(actor, user_id))


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, body: UserUpdate, actor: CurrentUser, service: UserServiceDep
) -> UserRead:
    return UserRead.model_validate(service.update_user(actor, user_id, body))


@router.post("/{user_id}/lock", response_model=UserRead)
def lock_user(user_id: int, actor: CurrentUser, service: UserServiceDep) -> UserRead:
    return UserRead.model_validate(service.lock_user(actor, user_id))


@router.post("/{user_id}/unlock", response_model=UserRead)
def unlock_user(user_id: int, actor: CurrentUser, service: UserServiceDep) -> UserRead:
    return UserRead.model_validate(service.unlock_user(actor, user_id))


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: int, body: ResetPasswordRequest, actor: CurrentUser, service: UserServiceDep
) -> None:
    service.reset_password(actor, user_id, body.new_password)
