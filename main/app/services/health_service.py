from app import __version__
from app.integrations import storage, task_queue
from app.integrations.redis_client import ping_redis
from app.repositories.system_repository import SystemRepository
from app.schemas.health import HealthResponse


class HealthService:
    def __init__(self, system_repository: SystemRepository) -> None:
        self.system_repository = system_repository

    def check(self) -> HealthResponse:
        redis_ok = ping_redis()
        services = {
            "database": self.system_repository.ping(),
            "redis": redis_ok,
            "storage": storage.bucket_exists(),
            # Chỉ hỏi worker khi Redis sống, tránh chờ timeout vô ích.
            "worker": redis_ok and self._worker_online(),
        }
        status = "ok" if all(services.values()) else "degraded"
        return HealthResponse(status=status, version=__version__, services=services)

    @staticmethod
    def _worker_online() -> bool:
        try:
            return task_queue.count_online_workers() > 0
        except Exception:
            return False
