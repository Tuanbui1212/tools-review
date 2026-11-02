# Task là "controller" của worker: nhận việc từ queue rồi gọi service.
# Tên task là hợp đồng với Main (Main gọi theo tên, không import code này).
from app.services.system_service import SystemService
from app.tasks.celery_app import celery_app


@celery_app.task(name="system.ping")
def ping() -> dict[str, str]:
    return SystemService().ping()
