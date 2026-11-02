import json
import uuid
from typing import Any

import redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.task_queue import send_task
from app.models.pipeline_task import PipelineTask
from app.models.user import User
from app.repositories.pipeline_task_repository import PipelineTaskRepository
from app.schemas.pipeline_task import PipelineTaskCreate, PipelineTaskProgressUpdate


class PipelineTaskService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PipelineTaskRepository(db)
        self.settings = get_settings()
        self._redis_client: redis.Redis | None = None

    @property
    def redis(self) -> redis.Redis:
        if self._redis_client is None:
            self._redis_client = redis.Redis.from_url(
                self.settings.redis_url, decode_responses=True
            )
        return self._redis_client

    def _publish_event(self, task: PipelineTask) -> None:
        """Bắn event tiến trình thời gian thực lên Redis Pub/Sub."""
        payload = {
            "task_id": task.task_id,
            "project_id": task.project_id,
            "chapter_id": task.chapter_id,
            "task_type": task.task_type,
            "queue_name": task.queue_name,
            "status": task.status,
            "progress": task.progress,
            "stage_message": task.stage_message,
            "result": task.result,
            "error_message": task.error_message,
        }
        message_str = json.dumps(payload, ensure_ascii=False)
        try:
            # 1. Channel theo task_id cụ thể
            self.redis.publish(f"channel:task:{task.task_id}", message_str)
            # 2. Channel theo chapter nếu có
            if task.chapter_id:
                self.redis.publish(f"channel:chapter:{task.chapter_id}", message_str)
        except Exception:
            # Không làm gián đoạn luồng chính nếu Redis Pub/Sub tạm thời lỗi
            pass

    def create_and_dispatch_task(
        self,
        task_name: str,
        *,
        project_id: int,
        chapter_id: int | None = None,
        task_type: str,
        queue_name: str = "io_queue",
        payload: dict[str, Any] | None = None,
        actor: User | None = None,
    ) -> PipelineTask:
        """Tạo bản ghi Task trong PostgreSQL và ĐẨY task vào hàng đợi Celery tương ứng."""
        task_uuid = str(uuid.uuid4())
        payload_data = payload or {}

        # 1. Lưu bản ghi pending vào DB
        task = self.repo.add(
            PipelineTask(
                task_id=task_uuid,
                project_id=project_id,
                chapter_id=chapter_id,
                task_type=task_type,
                queue_name=queue_name,
                status="pending",
                progress=0,
                stage_message="Đang xếp hàng chờ worker...",
                payload=payload_data,
                created_by=actor.id if actor else None,
            )
        )
        self.db.commit()
        self.db.refresh(task)

        # 2. Đẩy task vào hàng đợi Celery của Worker Server tương ứng
        kwargs = {
            "task_id": task_uuid,
            "project_id": project_id,
            "chapter_id": chapter_id,
            **payload_data,
        }
        send_task(task_name, queue=queue_name, kwargs=kwargs)

        # 3. Báo event khởi tạo
        self._publish_event(task)
        return task

    def update_task_progress(
        self,
        task_id: str,
        data: PipelineTaskProgressUpdate,
    ) -> PipelineTask | None:
        """Được gọi bởi Worker khi cập nhật % tiến độ từng bước."""
        task = self.repo.get_by_task_id(task_id)
        if not task:
            return None

        updated_task = self.repo.update_progress(
            task,
            progress=data.progress,
            stage_message=data.stage_message,
            status=data.status,
            result=data.result,
            error_message=data.error_message,
        )
        self._publish_event(updated_task)
        return updated_task

    def get_task(self, task_id: str) -> PipelineTask | None:
        return self.repo.get_by_task_id(task_id)

    def list_chapter_tasks(
        self, chapter_id: int, *, task_type: str | None = None
    ) -> list[PipelineTask]:
        return list(self.repo.list_by_chapter(chapter_id, task_type=task_type))

    def list_project_tasks(
        self, project_id: int, *, status: str | None = None
    ) -> list[PipelineTask]:
        return list(self.repo.list_by_project(project_id, status=status))
