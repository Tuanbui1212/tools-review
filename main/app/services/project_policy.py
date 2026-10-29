from app.models.project import Project, ProjectMember
from app.models.user import User


class ProjectPolicy:
    @staticmethod
    def can_view(actor: User, project: Project, membership: ProjectMember | None = None) -> bool:
        if actor.system_role == "admin":
            return True
        if actor.id == project.owner_id or membership is not None:
            return True
        if actor.system_role == "root":
            # Root thấy project của sub
            owner = getattr(project, "owner", None)
            if owner and owner.system_role == "sub":
                return True
        return False

    @staticmethod
    def can_edit(actor: User, project: Project, membership: ProjectMember | None = None) -> bool:
        """Sửa thông tin truyện, cấu hình settings (tầng 3), duyệt gate (D013)."""
        if not ProjectPolicy.can_view(actor, project, membership):
            return False
        if actor.system_role in ("admin", "root"):
            return True
        # Member trong project (kể cả Sub) có quyền như Editor
        return actor.id == project.owner_id or membership is not None

    @staticmethod
    def can_manage_members(
        actor: User, project: Project, membership: ProjectMember | None = None
    ) -> bool:
        """Mời thành viên, xoá thành viên, chuyển owner."""
        if not ProjectPolicy.can_view(actor, project, membership):
            return False
        if actor.system_role in ("admin", "root"):
            return True
        return actor.id == project.owner_id or (
            membership is not None and membership.role == "owner"
        )

    @staticmethod
    def can_delete(actor: User, project: Project, membership: ProjectMember | None = None) -> bool:
        """Xoá mềm project."""
        return ProjectPolicy.can_manage_members(actor, project, membership)
