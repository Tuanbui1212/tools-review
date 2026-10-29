from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ChapterStatus = Literal["draft", "ready", "processing", "completed", "error"]


class ChapterCreate(BaseModel):
    chapter_number: int = Field(..., ge=1, description="Số chapter (số nguyên dương >= 1)")
    title: str | None = Field(default=None, max_length=255, description="Tiêu đề chapter")


class ChapterUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    status: ChapterStatus | None = None


class ChapterPageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    page_number: int
    original_filename: str
    file_size_bytes: int
    width: int
    height: int
    mime_type: str
    file_hash: str
    is_duplicate_hash: bool
    file_url: str | None = None
    created_at: datetime


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    chapter_number: int
    title: str | None
    status: ChapterStatus
    total_pages: int
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime


class ChapterListResponse(BaseModel):
    items: list[ChapterRead]
    total: int


class ChapterReorderRequest(BaseModel):
    page_ids: list[int] = Field(..., min_length=1, description="Danh sách ID các trang theo thứ tự mới")
