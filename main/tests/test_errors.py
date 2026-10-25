"""A14: mọi lỗi trả về cùng định dạng { "error": { "code", "message", "details" } }."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _assert_error_shape(body: dict, code: str) -> None:
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details"}
    assert body["error"]["code"] == code


def test_a14_unauthenticated() -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    _assert_error_shape(response.json(), "not_authenticated")


def test_a14_invalid_token() -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    _assert_error_shape(response.json(), "invalid_token")


def test_a14_validation_error() -> None:
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422
    body = response.json()
    _assert_error_shape(body, "validation_error")
    assert body["error"]["details"]["errors"]


def test_a14_unknown_route() -> None:
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    _assert_error_shape(response.json(), "not_found")
