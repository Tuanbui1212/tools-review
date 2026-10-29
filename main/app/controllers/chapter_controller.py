from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.core.dependencies import CurrentUser, CurrentUserOrQuery, get_chapter_service
from app.schemas.chapter import (
    ChapterCreate,
    ChapterListResponse,
    ChapterPageRead,
    ChapterRead,
    ChapterReorderRequest,
    ChapterUpdate,
)
from app.services.chapter_service import ChapterService

router = APIRouter(tags=["chapters"])

ChapterServiceDep = Annotated[ChapterService, Depends(get_chapter_service)]


# --- Nhóm API Chapter theo Project ---

@router.get("/projects/{project_id}/chapters", response_model=ChapterListResponse)
def list_chapters(
    project_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ChapterListResponse:
    offset = (page - 1) * page_size
    items, total = service.list_chapters(
        actor,
        project_id,
        status_filter=status_filter,
        offset=offset,
        limit=page_size,
    )
    return ChapterListResponse(items=list(items), total=total)


@router.post("/projects/{project_id}/chapters", response_model=ChapterRead, status_code=status.HTTP_201_CREATED)
def create_chapter(
    project_id: int,
    body: ChapterCreate,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> ChapterRead:
    return service.create_chapter(actor, project_id, body)


# --- Nhóm API Chapter chi tiết ---

@router.get("/chapters/{chapter_id}", response_model=ChapterRead)
def get_chapter(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> ChapterRead:
    return service.get_chapter(actor, chapter_id)


@router.patch("/chapters/{chapter_id}", response_model=ChapterRead)
def update_chapter(
    chapter_id: int,
    body: ChapterUpdate,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> ChapterRead:
    return service.update_chapter(actor, chapter_id, body)


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> Response:
    service.delete_chapter(actor, chapter_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Nhóm API Upload & Trang ảnh ---

@router.post("/chapters/{chapter_id}/upload-images", response_model=list[ChapterPageRead])
async def upload_images(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
    files: list[UploadFile] = File(...),
) -> list[ChapterPageRead]:
    raw_files: list[tuple[str, bytes]] = []
    for f in files:
        content = await f.read()
        raw_files.append((f.filename or "unknown.jpg", content))

    service.upload_images(actor, chapter_id, raw_files)
    return service.list_pages(actor, chapter_id)


@router.post("/chapters/{chapter_id}/upload-zip", response_model=list[ChapterPageRead])
async def upload_zip(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
    file: UploadFile = File(...),
) -> list[ChapterPageRead]:
    zip_content = await file.read()
    service.upload_zip(actor, chapter_id, zip_content)
    return service.list_pages(actor, chapter_id)


@router.get("/chapters/{chapter_id}/pages", response_model=list[ChapterPageRead])
def list_pages(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> list[ChapterPageRead]:
    return service.list_pages(actor, chapter_id)


@router.put("/chapters/{chapter_id}/pages/reorder", response_model=list[ChapterPageRead])
def reorder_pages(
    chapter_id: int,
    body: ChapterReorderRequest,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> list[ChapterPageRead]:
    return service.reorder_pages(actor, chapter_id, body.page_ids)


@router.delete("/chapters/{chapter_id}/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    chapter_id: int,
    page_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> Response:
    service.delete_page(actor, chapter_id, page_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/chapters/{chapter_id}/pages", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_pages(
    chapter_id: int,
    actor: CurrentUser,
    service: ChapterServiceDep,
) -> Response:
    service.clear_all_pages(actor, chapter_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/chapters/{chapter_id}/pages/{page_id}/file")
def get_page_file(
    chapter_id: int,
    page_id: int,
    actor: CurrentUserOrQuery,
    service: ChapterServiceDep,
) -> FileResponse:
    file_path = service.get_page_file_path(actor, chapter_id, page_id)
    return FileResponse(path=file_path)
