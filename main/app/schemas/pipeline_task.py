from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PipelineTaskBase(BaseModel):
    task_id: str
    project_id: int
    chapter_id: int | None = None
    task_type: str
    queue_name: str
    status: str
    progress: int = 0
    stage_message: str | None = None


class PipelineTaskCreate(BaseModel):
    task_id: str
    project_id: int
    chapter_id: int | None = None
    task_type: str
    queue_name: str = "io_queue"
    payload: dict[str, Any] | None = None
    stage_message: str | None = None


class PipelineTaskProgressUpdate(BaseModel):
    progress: int
    stage_message: str | None = None
    status: str | None = None
    result: dict[str, Any] | None = None
    error_message: str | None = None


class PipelineTaskRead(PipelineTaskBase):
    id: int
    payload: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    error_message: str | None = None
    created_by: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
