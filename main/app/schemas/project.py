from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ComicType = Literal["manga", "manhwa", "manhua", "webtoon", "comic", "vn"]
ReadingDirection = Literal["rtl", "ltr", "ttb"]
AutomationLevel = Literal["full_auto", "review_script", "review_all"]
ProjectRole = Literal["owner", "member"]
InvitationStatus = Literal["pending", "accepted", "declined", "revoked"]

ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class ProjectCreate(BaseModel):
    name: ProjectName
    description: str | None = None
    comic_type: ComicType = "manga"
    reading_direction: ReadingDirection = "rtl"
    source_lang: str = "ja"
    target_lang: str = "vi"
    genre: list[str] = Field(default_factory=list)
    automation_level: AutomationLevel = "review_script"
    settings: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: ProjectName | None = None
    description: str | None = None
    comic_type: ComicType | None = None
    reading_direction: ReadingDirection | None = None
    source_lang: str | None = None
    target_lang: str | None = None
    genre: list[str] | None = None
    automation_level: AutomationLevel | None = None
    settings: dict[str, Any] | None = None
    owner_id: int | None = None


class ProjectMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    display_name: str | None
    system_role: str
    role: ProjectRole
    joined_at: datetime


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    owner_id: int
    owner_username: str
    comic_type: ComicType
    reading_direction: ReadingDirection
    source_lang: str
    target_lang: str
    genre: list[str]
    automation_level: AutomationLevel
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    my_role: ProjectRole | None = None
    members_count: int = 1


class ProjectStats(BaseModel):
    total: int
    active: int
    archived: int


class ProjectPage(BaseModel):
    items: list[ProjectRead]
    page: int
    page_size: int
    total: int
    stats: ProjectStats


class ProjectFilters(BaseModel):
    comic_type: ComicType | None = None
    q: str | None = Field(default=None, max_length=100)
    include_archived: bool = False


class ProjectInvitationCreate(BaseModel):
    identifier: str


class ProjectInvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    project_name: str
    invitee_user_id: int
    invitee_username: str
    invited_by: int
    inviter_username: str
    status: InvitationStatus
    created_at: datetime
    responded_at: datetime | None = None


class InvitationRespond(BaseModel):
    accept: bool


class UserCandidateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    email: str
    system_role: str


class UserCandidatePage(BaseModel):
    items: list[UserCandidateRead]
    page: int
    page_size: int
    total: int
    has_more: bool
