from app import __version__
from app.clients.main_client import MainClient
from app.clients.redis_client import ping_redis
from app.core.config import get_settings
from app.schemas.health import HealthResponse


class HealthService:
    def __init__(self, main_client: MainClient) -> None:
        self.main_client = main_client

    def check(self) -> HealthResponse:
        services = {
            "broker": ping_redis(),
            "main": self.main_client.is_reachable(),
        }
        status = "ok" if all(services.values()) else "degraded"
        return HealthResponse(
            status=status,
            version=__version__,
            worker_name=get_settings().worker_name,
            services=services,
        )
