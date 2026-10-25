from conftest import DEFAULT_PASSWORD, auth


def _new_user(username: str, role: str, password: str = DEFAULT_PASSWORD) -> dict:
    return {
        "username": username,
        "email": f"{username}@example.com",
        "password": password,
        "system_role": role,
    }


def test_a9_create_permissions(client, make_user, login) -> None:
    make_user("admin1", "admin")
    make_user("sub1")
    admin = auth(login("admin1"))

    assert (
        client.post("/api/v1/users", json=_new_user("root1", "root"), headers=admin).status_code
        == 201
    )
    assert (
        client.post("/api/v1/users", json=_new_user("sub2", "sub"), headers=admin).status_code
        == 201
    )

    root = auth(login("root1"))
    assert (
        client.post("/api/v1/users", json=_new_user("sub3", "sub"), headers=root).status_code == 201
    )
    forbidden = client.post("/api/v1/users", json=_new_user("root2", "root"), headers=root)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "forbidden_role"

    sub = auth(login("sub1"))
    assert (
        client.post("/api/v1/users", json=_new_user("sub4", "sub"), headers=sub).status_code == 403
    )


def test_a10_list_visibility(client, make_user, login) -> None:
    make_user("admin1", "admin")
    make_user("root1", "root")
    make_user("root2", "root")
    make_user("sub1")
    make_user("sub2")

    def usernames(headers: dict) -> set[str]:
        response = client.get("/api/v1/users", headers=headers)
        assert response.status_code == 200
        return {u["username"] for u in response.json()["items"]}

    assert usernames(auth(login("admin1"))) == {"admin1", "root1", "root2", "sub1", "sub2"}
    assert usernames(auth(login("root1"))) == {"root1", "sub1", "sub2"}
    assert client.get("/api/v1/users", headers=auth(login("sub1"))).status_code == 403


def test_list_filters(client, make_user, login) -> None:
    make_user("admin1", "admin")
    make_user("sub1")
    make_user("sub2", status="locked")
    admin = auth(login("admin1"))

    response = client.get("/api/v1/users?system_role=sub&status=active", headers=admin)
    assert [u["username"] for u in response.json()["items"]] == ["sub1"]
    response = client.get("/api/v1/users?q=sub2", headers=admin)
    assert [u["username"] for u in response.json()["items"]] == ["sub2"]


def test_a11_out_of_scope_users_look_missing(client, make_user, login) -> None:
    admin1 = make_user("admin1", "admin")
    make_user("root1", "root")
    root2 = make_user("root2", "root")
    sub1 = make_user("sub1")
    sub2 = make_user("sub2")

    root = auth(login("root1"))
    assert client.get(f"/api/v1/users/{root2.id}", headers=root).status_code == 404
    assert client.post(f"/api/v1/users/{admin1.id}/lock", headers=root).status_code == 404
    assert client.get(f"/api/v1/users/{sub1.id}", headers=root).status_code == 200

    sub = auth(login("sub1"))
    missing = client.get(f"/api/v1/users/{sub2.id}", headers=sub)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "user_not_found"
    assert client.get(f"/api/v1/users/{sub1.id}", headers=sub).status_code == 200
    assert client.get("/api/v1/users/999999", headers=sub).status_code == 404


def test_a12_cannot_lock_self(client, make_user, login) -> None:
    admin1 = make_user("admin1", "admin")
    root1 = make_user("root1", "root")

    response = client.post(f"/api/v1/users/{admin1.id}/lock", headers=auth(login("admin1")))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "cannot_lock_self"
    response = client.post(f"/api/v1/users/{root1.id}/lock", headers=auth(login("root1")))
    assert response.json()["error"]["code"] == "cannot_lock_self"


def test_admin_can_lock_other_admin_but_one_always_remains(client, make_user, login) -> None:
    make_user("admin1", "admin")
    admin2 = make_user("admin2", "admin")

    admin = auth(login("admin1"))
    assert client.post(f"/api/v1/users/{admin2.id}/lock", headers=admin).status_code == 200
    # admin1 giờ là admin duy nhất còn hoạt động và không thể tự khoá.
    assert client.get("/api/v1/auth/me", headers=admin).json()["status"] == "active"


def test_a13_conflicts_and_validation(client, make_user, login) -> None:
    make_user("admin1", "admin")
    make_user("taken")
    admin = auth(login("admin1"))

    same_username = _new_user("taken", "sub") | {"email": "other@example.com"}
    response = client.post("/api/v1/users", json=same_username, headers=admin)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "username_taken"

    same_email = _new_user("fresh", "sub") | {"email": "TAKEN@example.com"}
    response = client.post("/api/v1/users", json=same_email, headers=admin)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"

    short = client.post("/api/v1/users", json=_new_user("shorty", "sub", "1234567"), headers=admin)
    assert short.status_code == 422


def test_a15_pagination(client, make_user, login) -> None:
    make_user("admin1", "admin")
    for i in range(3):
        make_user(f"sub{i}")
    admin = auth(login("admin1"))

    body = client.get("/api/v1/users?page=2&page_size=2", headers=admin).json()
    assert (body["page"], body["page_size"], body["total"]) == (2, 2, 4)
    assert len(body["items"]) == 2

    body = client.get("/api/v1/users?page_size=500", headers=admin).json()
    assert body["page_size"] == 100


def test_update_self_and_managed_user(client, make_user, login) -> None:
    make_user("root1", "root")
    sub1 = make_user("sub1")
    sub = auth(login("sub1"))

    renamed = client.patch(
        f"/api/v1/users/{sub1.id}", json={"display_name": "Sub Một"}, headers=sub
    )
    assert renamed.status_code == 200
    assert renamed.json()["display_name"] == "Sub Một"
    own_email = client.patch(
        f"/api/v1/users/{sub1.id}", json={"email": "x@example.com"}, headers=sub
    )
    assert own_email.status_code == 403

    root = auth(login("root1"))
    email = client.patch(
        f"/api/v1/users/{sub1.id}", json={"email": "New@Example.com"}, headers=root
    )
    assert email.status_code == 200
    assert email.json()["email"] == "new@example.com"


def test_unlock_and_reset_password(client, make_user, login) -> None:
    make_user("root1", "root")
    sub1 = make_user("sub1", status="locked")
    root = auth(login("root1"))

    assert client.post(f"/api/v1/users/{sub1.id}/unlock", headers=root).json()["status"] == "active"
    response = client.post(
        f"/api/v1/users/{sub1.id}/reset-password",
        json={"new_password": "brand-new-pass"},
        headers=root,
    )
    assert response.status_code == 204
    login("sub1", "brand-new-pass")
