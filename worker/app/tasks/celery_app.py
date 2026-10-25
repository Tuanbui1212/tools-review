from celery import Celery
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.system_tasks"],
)

# Queue (D036): ai = gọi API trả phí, files = xử lý file, notify = thông báo.
celery_app.conf.update(
    task_queues=(Queue("ai"), Queue("files"), Queue("notify")),
    task_default_queue="files",
    timezone="UTC",
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={},
)
