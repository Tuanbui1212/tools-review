from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUser, get_page_params, get_project_service
from app.schemas.common import PageParams
from app.schemas.project import (
    ProjectCreate,
    ProjectFilters,
    ProjectInvitationCreate,
    ProjectInvitationRead,
    ProjectMemberRead,
    ProjectPage,
    ProjectRead,
    ProjectUpdate,
    UserCandidatePage,
    UserCandidateRead,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]


@router.get("", response_model=ProjectPage)
def list_projects(
    actor: CurrentUser,
    service: ProjectServiceDep,
    page: Annotated[PageParams, Depends(get_page_params)],
    filters: Annotated[ProjectFilters, Query()],
) -> ProjectPage:
    items, total, stats = service.list_projects(actor, filters, page)
    return ProjectPage(
        items=items,
        page=page.page,
        page_size=page.page_size,
        total=total,
        stats=stats,
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    actor: CurrentUser,
    body: ProjectCreate,
    service: ProjectServiceDep,
) -> ProjectRead:
    project = service.create_project(actor, body)
    return service.get_project(actor, project.id)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> ProjectRead:
    return service.get_project(actor, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> ProjectRead:
    service.update_project(actor, project_id, body)
    return service.get_project(actor, project_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> None:
    service.delete_project(actor, project_id)


@router.get("/{project_id}/members", response_model=list[ProjectMemberRead])
def list_members(
    project_id: int,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> list[ProjectMemberRead]:
    return list(service.list_members(actor, project_id))


@router.get("/{project_id}/candidates", response_model=UserCandidatePage)
def list_candidates(
    project_id: int,
    actor: CurrentUser,
    service: ProjectServiceDep,
    page: Annotated[PageParams, Depends(get_page_params)],
    q: str | None = Query(default=None, description="Tìm kiếm theo username, email, display_name"),
) -> UserCandidatePage:
    items, total = service.list_candidate_users(actor, project_id, query=q, page=page)
    return UserCandidatePage(
        items=[UserCandidateRead.model_validate(u) for u in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
        has_more=(page.offset + len(items)) < total,
    )


@router.post(
    "/{project_id}/invitations",
    response_model=ProjectInvitationRead,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    project_id: int,
    body: ProjectInvitationCreate,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> ProjectInvitationRead:
    invitation = service.invite_member(actor, project_id, body.identifier)
    return ProjectInvitationRead(
        id=invitation.id,
        project_id=invitation.project_id,
        project_name=invitation.project.name if invitation.project else "—",
        invitee_user_id=invitation.invitee_user_id,
        invitee_username=invitation.invitee.username if invitation.invitee else "—",
        invited_by=invitation.invited_by,
        inviter_username=invitation.inviter.username if invitation.inviter else "—",
        status=invitation.status,
        created_at=invitation.created_at,
        responded_at=invitation.responded_at,
    )


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> None:
    service.remove_member(actor, project_id, user_id)
