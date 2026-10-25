from conftest import DEFAULT_PASSWORD, auth
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.models.user import User


def _login_raw(client: TestClient, identifier: str, password: str = DEFAULT_PASSWORD):
    return client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})


def _refresh(client: TestClient, refresh_token: str):
    return client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})


def test_a3_login_with_username_or_email(client, make_user, login) -> None:
    make_user("alice")

    for identifier in ("alice", "ALICE@example.com"):
        tokens = login(identifier)
        assert tokens["token_type"] == "bearer"
        assert tokens["access_token"] and tokens["refresh_token"]
        me = client.get("/api/v1/auth/me", headers=auth(tokens))
        assert me.status_code == 200
        assert me.json()["username"] == "alice"


def test_a4_temporary_lock_after_five_failures(client, make_user) -> None:
    make_user("bob")

    for _ in range(5):
        response = _login_raw(client, "bob", "wrong-password")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_credentials"

    response = _login_raw(client, "bob")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "login_temporarily_locked"


def test_unknown_user_gets_same_error_as_wrong_password(client) -> None:
    response = _login_raw(client, "nobody")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_a5_locked_user_cannot_login_and_old_token_rejected(client, make_user, login) -> None:
    make_user("admin1", "admin")
    sub = make_user("carol")
    sub_tokens = login("carol")
    admin_tokens = login("admin1")

    assert (
        client.post(f"/api/v1/users/{sub.id}/lock", headers=auth(admin_tokens)).status_code == 200
    )

    assert client.get("/api/v1/auth/me", headers=auth(sub_tokens)).status_code == 401
    response = _login_raw(client, "carol")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "user_locked"
    assert _refresh(client, sub_tokens["refresh_token"]).status_code == 401


def test_a6_refresh_rotates_and_detects_reuse(client, make_user, login) -> None:
    make_user("dave")
    first = login("dave")

    rotated = _refresh(client, first["refresh_token"])
    assert rotated.status_code == 200
    second = rotated.json()
    assert second["refresh_token"] != first["refresh_token"]

    reused = _refresh(client, first["refresh_token"])
    assert reused.status_code == 401
    assert reused.json()["error"]["code"] == "refresh_token_reused"
    # Phát hiện dùng lại → mọi phiên của user bị thu hồi, kể cả token mới.
    assert _refresh(client, second["refresh_token"]).status_code == 401


def test_a7_logout_revokes_refresh_token(client, make_user, login) -> None:
    make_user("erin")
    tokens = login("erin")

    response = client.post(
        "/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=auth(tokens)
    )
    assert response.status_code == 204
    revoked = _refresh(client, tokens["refresh_token"])
    assert revoked.status_code == 401
    assert revoked.json()["error"]["code"] == "refresh_token_revoked"


def test_a8_change_password(client, make_user, login) -> None:
    make_user("frank")
    old = login("frank")

    wrong = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "not-it", "new_password": "new-password-1"},
        headers=auth(old),
    )
    assert wrong.status_code == 400
    assert wrong.json()["error"]["code"] == "invalid_current_password"

    changed = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "new-password-1"},
        headers=auth(old),
    )
    assert changed.status_code == 200
    new = changed.json()
    # Phiên cũ bị huỷ ngay, cả access lẫn refresh token; phiên mới dùng được.
    assert client.get("/api/v1/auth/me", headers=auth(old)).status_code == 401
    assert _refresh(client, old["refresh_token"]).json()["error"]["code"] == "refresh_token_revoked"
    assert client.get("/api/v1/auth/me", headers=auth(new)).status_code == 200
    assert _refresh(client, new["refresh_token"]).status_code == 200
    assert _login_raw(client, "frank").status_code == 401
    assert _login_raw(client, "frank", "new-password-1").status_code == 200


def test_a17_single_device_new_login_kicks_previous(client, make_user, login) -> None:
    make_user("henry")
    device_a = login("henry")
    device_b = login("henry")

    kicked = client.get("/api/v1/auth/me", headers=auth(device_a))
    assert kicked.status_code == 401
    assert kicked.json()["error"]["code"] == "session_replaced"
    refreshed = _refresh(client, device_a["refresh_token"])
    assert refreshed.status_code == 401
    assert refreshed.json()["error"]["code"] == "session_replaced"

    assert client.get("/api/v1/auth/me", headers=auth(device_b)).status_code == 200
    # Refresh không tính là đăng nhập mới: thiết bị B vẫn giữ phiên sau khi refresh.
    rotated = _refresh(client, device_b["refresh_token"]).json()
    assert client.get("/api/v1/auth/me", headers=auth(rotated)).status_code == 200


def test_a16_secrets_not_stored_in_plain_text(
    client, make_user, login, db_session: Session
) -> None:
    make_user("grace")
    tokens = login("grace")

    user = db_session.scalar(select(User).where(User.username == "grace"))
    assert user is not None
    assert DEFAULT_PASSWORD not in user.password_hash
    assert user.password_hash.startswith("$argon2")
    stored = db_session.scalars(select(RefreshToken.token_hash)).all()
    assert stored and tokens["refresh_token"] not in stored
