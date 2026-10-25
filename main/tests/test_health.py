import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_health_service
from app.main import app
from app.services import health_service
from app.services.health_service import HealthService


class _FakeSystemRepository:
    def __init__(self, ok: bool) -> None:
        self.ok = ok

    def ping(self) -> bool:
        return self.ok


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    # Giả lập kết nối để test không phải chờ timeout khi không có dịch vụ nào chạy.
    monkeypatch.setattr(health_service, "ping_redis", lambda: True)
    monkeypatch.setattr(health_service.storage, "bucket_exists", lambda: True)
    monkeypatch.setattr(health_service.task_queue, "count_online_workers", lambda: 1)
    app.dependency_overrides[get_health_service] = lambda: HealthService(
        _FakeSystemRepository(True)
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health_ok_when_every_service_is_up(client: TestClient) -> None:
    body = client.get("/api/health").json()

    assert body["status"] == "ok"
    assert body["services"] == {"database": True, "redis": True, "storage": True, "worker": True}


def test_health_degraded_when_database_down(client: TestClient) -> None:
    app.dependency_overrides[get_health_service] = lambda: HealthService(
        _FakeSystemRepository(False)
    )

    body = client.get("/api/health").json()

    assert body["status"] == "degraded"
    assert body["services"]["database"] is False


def test_swagger_is_available(client: TestClient) -> None:
    assert client.get("/docs").status_code == 200
