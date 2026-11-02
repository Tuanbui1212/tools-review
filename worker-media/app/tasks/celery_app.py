from celery import Celery
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "worker-media",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.system_tasks"],
)

# Worker Media chỉ phụ trách hàng đợi media_queue
celery_app.conf.update(
    task_queues=(Queue("media_queue"),),
    task_default_queue="media_queue",
    timezone="UTC",
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
