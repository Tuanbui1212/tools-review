from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import FileResponse

from app.core.dependencies import (
    CurrentUser,
    CurrentUserOrQuery,
    get_chapter_panel_service,
    get_chapter_service,
)
from app.schemas.chapter import ChapterPageRead
from app.schemas.chapter_panel import (
    ChapterPanelCreate,
    ChapterPanelRead,
    ChapterPanelsReorder,
    PagePanelsUpdate,
)
from app.schemas.pipeline_task import PipelineTaskRead
from app.services.chapter_panel_service import ChapterPanelService
from app.services.chapter_service import ChapterService

router = APIRouter(tags=["panels"])

ChapterPanelServiceDep = Annotated[ChapterPanelService, Depends(get_chapter_panel_service)]
ChapterServiceDep = Annotated[ChapterService, Depends(get_chapter_service)]


@router.post("/chapters/{chapter_id}/extract-panels", response_model=PipelineTaskRead)
def trigger_extract_panels(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterPanelServiceDep,
) -> PipelineTaskRead:
    """Kích hoạt cắt khung tranh tự động cho toàn bộ chapter (gửi task sang worker-ai)."""
    task = service.trigger_extract_panels(actor, chapter_id)
    return PipelineTaskRead.model_validate(task)


@router.get("/chapters/{chapter_id}/panels", response_model=list[ChapterPanelRead])
def list_chapter_panels(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterPanelServiceDep,
) -> list[ChapterPanelRead]:
    """Lấy danh sách tất cả các panel của chapter kèm toạ độ và thứ tự đọc."""
    panels = service.list_chapter_panels(actor, chapter_id)
    result: list[ChapterPanelRead] = []
    for p in panels:
        item = ChapterPanelRead.model_validate(p)
        item.image_url = f"/api/v1/chapters/{chapter_id}/panels/{p.id}/file"
        result.append(item)
    return result


@router.get("/chapter-pages/{page_id}/panels", response_model=list[ChapterPanelRead])
def list_page_panels(
    page_id: int,
    actor: CurrentUser,
    service: ChapterPanelServiceDep,
) -> list[ChapterPanelRead]:
    """Lấy danh sách panel của riêng 1 trang truyện để render lên Web Canvas."""
    panels = service.list_page_panels(actor, page_id)
    result: list[ChapterPanelRead] = []
    for p in panels:
        item = ChapterPanelRead.model_validate(p)
        item.image_url = f"/api/v1/chapters/{p.chapter_id}/panels/{p.id}/file"
        result.append(item)
    return result


@router.put("/chapter-pages/{page_id}/panels", response_model=list[ChapterPanelRead])
def update_page_panels(
    page_id: int,
    body: PagePanelsUpdate,
    actor: CurrentUser,
    service: ChapterPanelServiceDep,
) -> list[ChapterPanelRead]:
    """Lưu lại danh sách panel sau khi người dùng chỉnh sửa/vẽ mới/xoá trên Web Canvas."""
    panels = service.update_page_panels(actor, page_id, body)
    result: list[ChapterPanelRead] = []
    for p in panels:
        item = ChapterPanelRead.model_validate(p)
        item.image_url = f"/api/v1/chapters/{p.chapter_id}/panels/{p.id}/file"
        result.append(item)
    return result


@router.put("/chapters/{chapter_id}/panels/reorder", response_model=list[ChapterPanelRead])
def reorder_chapter_panels(
    chapter_id: int,
    body: ChapterPanelsReorder,
    actor: CurrentUser,
    service: ChapterPanelServiceDep,
) -> list[ChapterPanelRead]:
    """Đổi lại số thứ tự đọc (panel_number) của các panel trong chapter."""
    panels = service.reorder_panels(actor, chapter_id, body.panel_ids)
    result: list[ChapterPanelRead] = []
    for p in panels:
        item = ChapterPanelRead.model_validate(p)
        item.image_url = f"/api/v1/chapters/{chapter_id}/panels/{p.id}/file"
        result.append(item)
    return result


@router.get("/chapters/{chapter_id}/panels/{panel_id}/file")
def get_panel_file(
    chapter_id: int,
    panel_id: int,
    actor: CurrentUserOrQuery,
    service: ChapterPanelServiceDep,
) -> FileResponse:
    """Tải / xem trực tiếp file ảnh của panel đã crop."""
    file_path = service.get_panel_file_path(actor, chapter_id, panel_id)
    return FileResponse(path=file_path)


# --- Internal APIs cho Worker AI ---

@router.get("/internal/chapters/{chapter_id}/pages", response_model=list[ChapterPageRead])
def get_chapter_pages_internal(
    chapter_id: int,
    service: ChapterServiceDep,
) -> list[ChapterPageRead]:
    """Internal API: Worker AI lấy danh sách trang ảnh và đường dẫn đĩa để xử lý."""
    pages = service.page_repo.list_by_chapter(chapter_id)
    return [ChapterPageRead.model_validate(p) for p in pages]


@router.post(
    "/internal/chapters/{chapter_id}/panels/batch",
    response_model=list[ChapterPanelRead],
    status_code=status.HTTP_201_CREATED,
)
def save_panels_batch_internal(
    chapter_id: int,
    panels_data: list[ChapterPanelCreate],
    service: ChapterPanelServiceDep,
) -> list[ChapterPanelRead]:
    """Internal API: Worker AI đẩy toàn bộ kết quả toạ độ và đường dẫn ảnh panel sau khi cắt."""
    panels = service.save_panels_batch_internal(chapter_id, panels_data)
    return [ChapterPanelRead.model_validate(p) for p in panels]

