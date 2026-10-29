from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, get_project_service
from app.schemas.project import InvitationRespond, ProjectInvitationRead
from app.services.project_service import ProjectService

router = APIRouter(prefix="/invitations", tags=["invitations"])

ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]


@router.get("/me", response_model=list[ProjectInvitationRead])
def list_my_invitations(
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> list[ProjectInvitationRead]:
    invitations = service.list_my_invitations(actor)
    return [
        ProjectInvitationRead(
            id=inv.id,
            project_id=inv.project_id,
            project_name=inv.project.name if inv.project else "—",
            invitee_user_id=inv.invitee_user_id,
            invitee_username=actor.username,
            invited_by=inv.invited_by,
            inviter_username=inv.inviter.username if inv.inviter else "—",
            status=inv.status,
            created_at=inv.created_at,
            responded_at=inv.responded_at,
        )
        for inv in invitations
    ]


@router.post("/{invitation_id}/respond", status_code=status.HTTP_204_NO_CONTENT)
def respond_invitation(
    invitation_id: int,
    body: InvitationRespond,
    actor: CurrentUser,
    service: ProjectServiceDep,
) -> None:
    service.respond_invitation(actor, invitation_id, body.accept)
