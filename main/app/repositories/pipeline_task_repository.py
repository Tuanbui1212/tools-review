from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import desc, select

from app.models.pipeline_task import PipelineTask
from app.repositories.base import BaseRepository


class PipelineTaskRepository(BaseRepository[PipelineTask]):
    model = PipelineTask

    def get_by_task_id(self, task_id: str) -> PipelineTask | None:
        stmt = select(PipelineTask).where(PipelineTask.task_id == task_id)
        return self.db.scalar(stmt)

    def list_by_chapter(
        self,
        chapter_id: int,
        *,
        task_type: str | None = None,
        limit: int = 50,
    ) -> Sequence[PipelineTask]:
        stmt = (
            select(PipelineTask)
            .where(PipelineTask.chapter_id == chapter_id)
            .order_by(desc(PipelineTask.created_at))
            .limit(limit)
        )
        if task_type:
            stmt = stmt.where(PipelineTask.task_type == task_type)
        return self.db.scalars(stmt).all()

    def list_by_project(
        self,
        project_id: int,
        *,
        status: str | None = None,
        limit: int = 50,
    ) -> Sequence[PipelineTask]:
        stmt = (
            select(PipelineTask)
            .where(PipelineTask.project_id == project_id)
            .order_by(desc(PipelineTask.created_at))
            .limit(limit)
        )
        if status:
            stmt = stmt.where(PipelineTask.status == status)
        return self.db.scalars(stmt).all()

    def update_progress(
        self,
        task: PipelineTask,
        *,
        progress: int,
        stage_message: str | None = None,
        status: str | None = None,
        result: dict | None = None,
        error_message: str | None = None,
    ) -> PipelineTask:
        task.progress = progress
        if stage_message is not None:
            task.stage_message = stage_message
        if status is not None:
            task.status = status
            if status == "processing" and not task.started_at:
                task.started_at = datetime.now(timezone.utc)
            elif status in ("completed", "failed", "cancelled") and not task.finished_at:
                task.finished_at = datetime.now(timezone.utc)
        if result is not None:
            task.result = result
        if error_message is not None:
            task.error_message = error_message

        self.db.commit()
        self.db.refresh(task)
        return task
