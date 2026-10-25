"""Main chỉ ĐẨY task vào Redis; code xử lý task nằm ở worker server riêng (D045).

Main gọi task theo tên (ví dụ "system.ping"), không import code của worker.
"""

from functools import lru_cache
from typing import Any

from celery import Celery
from celery.result import AsyncResult

from app.core.config import get_settings


@lru_cache
def get_task_queue() -> Celery:
    settings = get_settings()
    app = Celery("main-producer", broker=settings.redis_url, backend=settings.redis_url)
    app.conf.update(broker_connection_timeout=2, broker_connection_max_retries=1)
    return app


def send_task(name: str, *, queue: str, kwargs: dict[str, Any] | None = None) -> AsyncResult:
    return get_task_queue().send_task(name, kwargs=kwargs or {}, queue=queue)


def count_online_workers() -> int:
    replies = get_task_queue().control.ping(timeout=1.0)
    return len(replies or [])
