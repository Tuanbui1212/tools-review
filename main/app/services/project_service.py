from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models.project import Project, ProjectInvitation, ProjectMember
from app.models.user import User
from app.repositories.project_invitation_repository import ProjectInvitationRepository
from app.repositories.project_member_repository import ProjectMemberRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PageParams
from app.schemas.project import (
    ProjectCreate,
    ProjectFilters,
    ProjectMemberRead,
    ProjectRead,
    ProjectRole,
    ProjectStats,
    ProjectUpdate,
)
from app.services.project_policy import ProjectPolicy


class ProjectService:
    def __init__(
        self,
        db: Session,
        projects: ProjectRepository,
        members: ProjectMemberRepository,
        invitations: ProjectInvitationRepository,
        users: UserRepository,
    ) -> None:
        self.db = db
        self.projects = projects
        self.members = members
        self.invitations = invitations
        self.users = users

    def _determine_my_role(self, actor: User, project: Project) -> ProjectRole | None:
        if project.owner_id == actor.id:
            return "owner"
        for m in getattr(project, "members", []):
            if m.user_id == actor.id:
                return m.role
        return None

    def list_projects(
        self, actor: User, filters: ProjectFilters, page: PageParams
    ) -> tuple[list[ProjectRead], int, ProjectStats]:
        items, total = self.projects.search(
            actor,
            comic_type=filters.comic_type,
            query=filters.q,
            include_archived=filters.include_archived,
            offset=page.offset,
            limit=page.page_size,
        )
        total_stat, active_stat, archived_stat = self.projects.get_stats(actor)
        stats = ProjectStats(total=total_stat, active=active_stat, archived=archived_stat)

        results: list[ProjectRead] = []
        for p in items:
            results.append(
                ProjectRead(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    owner_id=p.owner_id,
                    owner_username=p.owner.username if p.owner else "—",
                    comic_type=p.comic_type,
                    reading_direction=p.reading_direction,
                    source_lang=p.source_lang,
                    target_lang=p.target_lang,
                    genre=p.genre or [],
                    automation_level=p.automation_level,
                    settings=p.settings or {},
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    deleted_at=p.deleted_at,
                    my_role=self._determine_my_role(actor, p),
                    members_count=len(p.members) if getattr(p, "members", None) else 1,
                )
            )

        return results, total, stats

    def create_project(self, actor: User, data: ProjectCreate) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            owner_id=actor.id,
            comic_type=data.comic_type,
            reading_direction=data.reading_direction,
            source_lang=data.source_lang,
            target_lang=data.target_lang,
            genre=data.genre,
            automation_level=data.automation_level,
            settings=data.settings,
        )
        self.projects.add(project)
        self.db.flush()

        # Người tạo tự động trở thành owner trong bảng project_members
        member = ProjectMember(
            project_id=project.id,
            user_id=actor.id,
            role="owner",
            invited_by=None,
        )
        self.members.add(member)
        self._commit()
        return project

    def get_project(self, actor: User, project_id: int) -> ProjectRead:
        project = self.projects.get_with_details(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        my_role = self._determine_my_role(actor, project)
        return ProjectRead(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_id=project.owner_id,
            owner_username=project.owner.username if project.owner else "—",
            comic_type=project.comic_type,
            reading_direction=project.reading_direction,
            source_lang=project.source_lang,
            target_lang=project.target_lang,
            genre=project.genre or [],
            automation_level=project.automation_level,
            settings=project.settings or {},
            created_at=project.created_at,
            updated_at=project.updated_at,
            deleted_at=project.deleted_at,
            my_role=my_role,
            members_count=len(project.members) if getattr(project, "members", None) else 1,
        )

    def update_project(self, actor: User, project_id: int, data: ProjectUpdate) -> Project:
        project = self.projects.get_with_details(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")
        if not ProjectPolicy.can_edit(actor, project, membership):
            raise ForbiddenError("forbidden", "Không có quyền chỉnh sửa dự án này")

        changes = data.model_dump(exclude_unset=True)

        # Chuyển quyền owner
        if "owner_id" in changes and changes["owner_id"] is not None:
            if not ProjectPolicy.can_manage_members(actor, project, membership):
                raise ForbiddenError(
                    "forbidden", "Chỉ owner hoặc quản trị viên mới được chuyển quyền sở hữu"
                )
            new_owner = self.users.get(changes["owner_id"])
            if new_owner is None or new_owner.status != "active":
                raise BadRequestError("invalid_owner", "Tài khoản nhận quyền sở hữu không hợp lệ")

            project.owner_id = new_owner.id
            existing_m = self.members.get_membership(project.id, new_owner.id)
            if existing_m:
                existing_m.role = "owner"
            else:
                self.members.add(
                    ProjectMember(
                        project_id=project.id,
                        user_id=new_owner.id,
                        role="owner",
                        invited_by=actor.id,
                    )
                )

        for field, value in changes.items():
            if field != "owner_id" and value is not None:
                setattr(project, field, value)

        self._commit()
        return project

    def delete_project(self, actor: User, project_id: int) -> None:
        project = self.projects.get(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")
        if not ProjectPolicy.can_delete(actor, project, membership):
            raise ForbiddenError("forbidden", "Không có quyền xoá dự án này")

        project.deleted_at = datetime.now(UTC)
        self._commit()

    def list_members(self, actor: User, project_id: int) -> Sequence[ProjectMemberRead]:
        project = self.projects.get(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        members = self.members.list_by_project(project_id)
        return [
            ProjectMemberRead(
                user_id=m.user_id,
                username=m.user.username,
                display_name=m.user.display_name,
                system_role=m.user.system_role,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in members
        ]

    def invite_member(self, actor: User, project_id: int, identifier: str) -> ProjectInvitation:
        project = self.projects.get(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")
        if not ProjectPolicy.can_manage_members(actor, project, membership):
            raise ForbiddenError("forbidden", "Không có quyền mời thành viên vào dự án này")

        target_user = self.users.get_by_login(identifier)
        if target_user is None or target_user.status != "active":
            raise NotFoundError("user_not_found", "Không tìm thấy tài khoản người dùng")

        if self.members.get_membership(project_id, target_user.id) is not None:
            raise ConflictError(
                "already_member", f"{target_user.username} đã là thành viên của dự án"
            )

        existing_inv = self.invitations.get_pending(project_id, target_user.id)
        if existing_inv is not None:
            raise ConflictError(
                "invitation_pending", f"Đã có lời mời đang chờ {target_user.username} phản hồi"
            )

        invitation = ProjectInvitation(
            project_id=project_id,
            invitee_user_id=target_user.id,
            invited_by=actor.id,
            status="pending",
        )
        self.invitations.add(invitation)
        self._commit()
        return invitation

    def remove_member(self, actor: User, project_id: int, target_user_id: int) -> None:
        project = self.projects.get(project_id)
        if project is None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        target_m = self.members.get_membership(project_id, target_user_id)
        if target_m is None:
            raise NotFoundError("member_not_found", "Thành viên không thuộc dự án này")

        # Cho phép tự rời dự án hoặc người có quyền manage_members xoá
        is_self = actor.id == target_user_id
        if not is_self and not ProjectPolicy.can_manage_members(actor, project, membership):
            raise ForbiddenError("forbidden", "Không có quyền xoá thành viên khỏi dự án")

        if target_m.role == "owner" and self.members.count_owners(project_id) <= 1:
            raise BadRequestError(
                "cannot_remove_last_owner", "Không thể xoá hoặc rời khi là owner duy nhất của dự án"
            )

        self.members.delete(target_m)
        self._commit()

    def list_my_invitations(self, actor: User) -> list[ProjectInvitation]:
        return list(self.invitations.list_by_invitee(actor.id))

    def respond_invitation(self, actor: User, invitation_id: int, accept: bool) -> None:
        invitation = self.invitations.get_with_details(invitation_id)
        if invitation is None or invitation.invitee_user_id != actor.id:
            raise NotFoundError("invitation_not_found", "Không tìm thấy lời mời")

        if invitation.status != "pending":
            raise BadRequestError("invitation_not_pending", "Lời mời này đã được phản hồi trước đó")

        now = datetime.now(UTC)
        if accept:
            invitation.status = "accepted"
            invitation.responded_at = now
            # Thêm vào members nếu chưa có
            if self.members.get_membership(invitation.project_id, actor.id) is None:
                self.members.add(
                    ProjectMember(
                        project_id=invitation.project_id,
                        user_id=actor.id,
                        role="member",
                        invited_by=invitation.invited_by,
                    )
                )
        else:
            invitation.status = "declined"
            invitation.responded_at = now

        self._commit()

    def list_candidate_users(
        self,
        actor: User,
        project_id: int,
        query: str | None,
        page: PageParams,
    ) -> tuple[Sequence[User], int]:
        project = self.projects.get(project_id)
        if not project or project.deleted_at is not None:
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")

        membership = self.members.get_membership(project_id, actor.id)
        if not ProjectPolicy.can_view(actor, project, membership):
            raise NotFoundError("project_not_found", "Không tìm thấy dự án")
        if not ProjectPolicy.can_manage_members(actor, project, membership):
            raise ForbiddenError("forbidden", "Không có quyền quản lý thành viên dự án này")

        return self.users.search_candidates_for_project(
            project_id=project_id,
            query=query,
            offset=page.offset,
            limit=page.page_size,
        )

    def _commit(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("conflict", "Dữ liệu bị trùng lặp hoặc xung đột") from exc
