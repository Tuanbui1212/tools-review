from conftest import auth


def _project_data(name: str = "One Piece", comic_type: str = "manga") -> dict:
    return {
        "name": name,
        "description": "Hành trình tìm kiếm kho báu",
        "comic_type": comic_type,
        "reading_direction": "rtl",
        "source_lang": "ja",
        "target_lang": "vi",
        "genre": ["Hành động", "Phiêu lưu"],
        "automation_level": "review_script",
        "settings": {"custom_font": "Be Vietnam Pro"},
    }


def test_create_project(client, make_user, login) -> None:
    make_user("user1")
    user1 = auth(login("user1"))

    res = client.post("/api/v1/projects", json=_project_data("Naruto"), headers=user1)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["name"] == "Naruto"
    assert data["owner_username"] == "user1"
    assert data["my_role"] == "owner"
    assert data["members_count"] == 1


def test_list_visibility(client, make_user, login) -> None:
    make_user("admin1", "admin")
    make_user("root1", "root")
    make_user("root2", "root")
    make_user("sub1", "sub")
    make_user("sub2", "sub")

    admin = auth(login("admin1"))
    root1 = auth(login("root1"))
    root2 = auth(login("root2"))
    sub1 = auth(login("sub1"))
    sub2 = auth(login("sub2"))

    # root1 creates P1
    client.post("/api/v1/projects", json=_project_data("P_Root1"), headers=root1)
    # sub1 creates P2
    client.post("/api/v1/projects", json=_project_data("P_Sub1"), headers=sub1)
    # root2 creates P3
    client.post("/api/v1/projects", json=_project_data("P_Root2"), headers=root2)

    # Admin sees all 3
    admin_list = client.get("/api/v1/projects", headers=admin).json()
    admin_names = {p["name"] for p in admin_list["items"]}
    assert admin_names == {"P_Root1", "P_Sub1", "P_Root2"}
    assert admin_list["stats"]["total"] == 3

    # Root1 sees P_Root1 (owned) and P_Sub1 (owner is sub), but NOT P_Root2 (root2 owned)
    root1_list = client.get("/api/v1/projects", headers=root1).json()
    root1_names = {p["name"] for p in root1_list["items"]}
    assert root1_names == {"P_Root1", "P_Sub1"}
    assert root1_list["stats"]["total"] == 2

    # Sub1 sees only P_Sub1
    sub1_list = client.get("/api/v1/projects", headers=sub1).json()
    assert {p["name"] for p in sub1_list["items"]} == {"P_Sub1"}

    # Sub2 has not created any project -> empty
    sub2_list = client.get("/api/v1/projects", headers=sub2).json()
    assert len(sub2_list["items"]) == 0
    assert sub2_list["stats"]["total"] == 0


def test_get_and_update_project(client, make_user, login) -> None:
    make_user("user1")
    make_user("stranger")
    user1 = auth(login("user1"))
    stranger = auth(login("stranger"))

    res = client.post("/api/v1/projects", json=_project_data("Dragon Ball"), headers=user1)
    p_id = res.json()["id"]

    # Stranger cannot view -> 404
    assert client.get(f"/api/v1/projects/{p_id}", headers=stranger).status_code == 404

    # Stranger cannot edit -> 404
    assert (
        client.patch(
            f"/api/v1/projects/{p_id}", json={"name": "Hacked"}, headers=stranger
        ).status_code
        == 404
    )

    # User1 can update
    updated = client.patch(
        f"/api/v1/projects/{p_id}",
        json={"description": "Mô tả mới", "automation_level": "full_auto"},
        headers=user1,
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Mô tả mới"
    assert updated.json()["automation_level"] == "full_auto"


def test_delete_soft_delete(client, make_user, login) -> None:
    make_user("user1")
    user1 = auth(login("user1"))

    res = client.post("/api/v1/projects", json=_project_data("Bleach"), headers=user1)
    p_id = res.json()["id"]

    # Delete
    assert client.delete(f"/api/v1/projects/{p_id}", headers=user1).status_code == 204

    # List default excludes archived
    listed = client.get("/api/v1/projects", headers=user1).json()
    assert len(listed["items"]) == 0
    assert listed["stats"]["archived"] == 1
    assert listed["stats"]["active"] == 0

    # List with include_archived=true
    listed_archived = client.get("/api/v1/projects?include_archived=true", headers=user1).json()
    assert len(listed_archived["items"]) == 1
    assert listed_archived["items"][0]["deleted_at"] is not None


def test_invitations_and_members(client, make_user, login) -> None:
    make_user("owner1")
    make_user("invitee1")
    owner = auth(login("owner1"))
    invitee = auth(login("invitee1"))

    p = client.post("/api/v1/projects", json=_project_data("Attack on Titan"), headers=owner).json()
    p_id = p["id"]

    # Invite user
    inv_res = client.post(
        f"/api/v1/projects/{p_id}/invitations",
        json={"identifier": "invitee1"},
        headers=owner,
    )
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # Inviting again returns 409
    assert (
        client.post(
            f"/api/v1/projects/{p_id}/invitations",
            json={"identifier": "invitee1"},
            headers=owner,
        ).status_code
        == 409
    )

    # Invitee sees invitation
    my_invs = client.get("/api/v1/invitations/me", headers=invitee).json()
    assert len(my_invs) == 1
    assert my_invs[0]["id"] == inv_id

    # Invitee accepts
    assert (
        client.post(
            f"/api/v1/invitations/{inv_id}/respond",
            json={"accept": True},
            headers=invitee,
        ).status_code
        == 204
    )

    # Now invitee is member and can view project!
    p_view = client.get(f"/api/v1/projects/{p_id}", headers=invitee)
    assert p_view.status_code == 200
    assert p_view.json()["my_role"] == "member"

    # Members list has both owner1 and invitee1
    members = client.get(f"/api/v1/projects/{p_id}/members", headers=owner).json()
    assert {m["username"] for m in members} == {"owner1", "invitee1"}

    # Owner removes member
    invitee_user_id = next(m["user_id"] for m in members if m["username"] == "invitee1")
    assert (
        client.delete(
            f"/api/v1/projects/{p_id}/members/{invitee_user_id}", headers=owner
        ).status_code
        == 204
    )

    # Now invitee cannot view project
    assert client.get(f"/api/v1/projects/{p_id}", headers=invitee).status_code == 404


def test_list_candidate_users(client, make_user, login) -> None:
    make_user("owner_cand")
    make_user("cand1")
    make_user("cand2")
    make_user("cand3")
    owner = auth(login("owner_cand"))

    p = client.post("/api/v1/projects", json=_project_data("CandProj"), headers=owner).json()
    p_id = p["id"]

    # Search candidates (page 1, limit 2)
    res = client.get(
        f"/api/v1/projects/{p_id}/candidates",
        params={"page": 1, "page_size": 2},
        headers=owner,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 3
    assert data["has_more"] is True
    # owner is not candidate
    assert all(u["username"] != "owner_cand" for u in data["items"])

    # Search with q
    q_res = client.get(
        f"/api/v1/projects/{p_id}/candidates",
        params={"q": "cand2"},
        headers=owner,
    )
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert len(q_data["items"]) == 1
    assert q_data["items"][0]["username"] == "cand2"
    assert q_data["has_more"] is False

