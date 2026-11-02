from celery import Celery
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "worker-ai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.system_tasks"],
)

# Worker AI chỉ phụ trách hàng đợi ai_queue
celery_app.conf.update(
    task_queues=(Queue("ai_queue"),),
    task_default_queue="ai_queue",
    timezone="UTC",
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
