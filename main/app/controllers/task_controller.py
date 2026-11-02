import asyncio
import json
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, get_pipeline_task_service
from app.schemas.pipeline_task import PipelineTaskProgressUpdate, PipelineTaskRead
from app.services.pipeline_task_service import PipelineTaskService

router = APIRouter(tags=["tasks"])

PipelineTaskServiceDep = Annotated[PipelineTaskService, Depends(get_pipeline_task_service)]


@router.get("/tasks/{task_id}", response_model=PipelineTaskRead)
def get_task(
    task_id: str,
    actor: CurrentUser,
    service: PipelineTaskServiceDep,
) -> PipelineTaskRead:
    """Lấy trạng thái và tiến độ của một task (REST Polling fallback)."""
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy task",
        )
    return PipelineTaskRead.model_validate(task)


@router.patch("/internal/tasks/{task_id}/progress", response_model=PipelineTaskRead)
def update_task_progress(
    task_id: str,
    data: PipelineTaskProgressUpdate,
    service: PipelineTaskServiceDep,
) -> PipelineTaskRead:
    """Internal API: Worker Server gọi cập nhật % tiến độ và giai đoạn xử lý."""
    task = service.update_task_progress(task_id, data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy task để cập nhật",
        )
    return PipelineTaskRead.model_validate(task)


@router.get("/chapters/{chapter_id}/tasks", response_model=list[PipelineTaskRead])
def list_chapter_tasks(
    chapter_id: int,
    actor: CurrentUser,
    service: PipelineTaskServiceDep,
    task_type: str | None = None,
) -> list[PipelineTaskRead]:
    """Danh sách các task của một chapter."""
    tasks = service.list_chapter_tasks(chapter_id, task_type=task_type)
    return [PipelineTaskRead.model_validate(t) for t in tasks]


@router.get("/projects/{project_id}/tasks", response_model=list[PipelineTaskRead])
def list_project_tasks(
    project_id: int,
    actor: CurrentUser,
    service: PipelineTaskServiceDep,
    task_status: str | None = None,
) -> list[PipelineTaskRead]:
    """Danh sách các task của một dự án."""
    tasks = service.list_project_tasks(project_id, status=task_status)
    return [PipelineTaskRead.model_validate(t) for t in tasks]


@router.websocket("/ws/tasks/{task_id}")
async def websocket_task_progress(websocket: WebSocket, task_id: str) -> None:
    """WebSocket thời gian thực: Client lắng nghe % tiến độ của task cụ thể."""
    await websocket.accept()
    settings = get_settings()
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel_name = f"channel:task:{task_id}"

    try:
        await pubsub.subscribe(channel_name)
        while True:
            # Nhận message từ Redis Pub/Sub bất đồng bộ
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                data = message.get("data")
                if data:
                    await websocket.send_text(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis_client.close()


@router.websocket("/ws/chapters/{chapter_id}")
async def websocket_chapter_progress(websocket: WebSocket, chapter_id: int) -> None:
    """WebSocket thời gian thực: Client lắng nghe mọi tiến trình xảy ra trên Chapter này."""
    await websocket.accept()
    settings = get_settings()
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel_name = f"channel:chapter:{chapter_id}"

    try:
        await pubsub.subscribe(channel_name)
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                data = message.get("data")
                if data:
                    await websocket.send_text(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis_client.close()
