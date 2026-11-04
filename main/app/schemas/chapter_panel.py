from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChapterPanelBase(BaseModel):
    bbox_x: int = Field(ge=0, description="Toạ độ X góc trên bên trái")
    bbox_y: int = Field(ge=0, description="Toạ độ Y góc trên bên trái")
    bbox_width: int = Field(gt=0, description="Chiều rộng khung")
    bbox_height: int = Field(gt=0, description="Chiều cao khung")
    is_full_page: bool = False


class ChapterPanelCreate(ChapterPanelBase):
    chapter_page_id: int
    panel_number: int = Field(ge=1)
    panel_index_in_page: int = Field(ge=1)
    image_path: str | None = None
    google_drive_file_id: str | None = None


class ChapterPanelRead(ChapterPanelBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    chapter_page_id: int
    panel_number: int
    panel_index_in_page: int
    image_path: str | None = None
    image_url: str | None = None
    google_drive_file_id: str | None = None
    created_at: datetime
    updated_at: datetime


class PagePanelItem(BaseModel):
    id: int | None = None
    panel_index_in_page: int = Field(ge=1)
    bbox_x: int = Field(ge=0)
    bbox_y: int = Field(ge=0)
    bbox_width: int = Field(gt=0)
    bbox_height: int = Field(gt=0)
    is_full_page: bool = False


class PagePanelsUpdate(BaseModel):
    panels: list[PagePanelItem]


class ChapterPanelsReorder(BaseModel):
    panel_ids: list[int] = Field(min_length=1, description="Danh sách ID panel theo thứ tự đọc mới")

