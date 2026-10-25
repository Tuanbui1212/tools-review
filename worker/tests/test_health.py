from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_broker_and_main() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert set(body["services"]) == {"broker", "main"}
