import io
import zipfile
from PIL import Image

from conftest import auth


def _create_sample_image(width: int = 100, height: int = 150, color: str = "red") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _create_sample_zip(images: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, content in images:
            zf.writestr(name, content)
        # Thêm file rác hệ điều hành
        zf.writestr("__MACOSX/._hidden.jpg", b"junk")
        zf.writestr(".DS_Store", b"junk")
    return buf.getvalue()


def test_create_chapter(client, make_user, login) -> None:
    make_user("user1")
    user1 = auth(login("user1"))

    # Tạo project
    p_res = client.post("/api/v1/projects", json={"name": "Project Chap Test"}, headers=user1)
    project_id = p_res.json()["id"]

    # Tạo chapter 1
    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Hồi 1"},
        headers=user1,
    )
    assert c_res.status_code == 201, c_res.text
    data = c_res.json()
    assert data["chapter_number"] == 1
    assert data["title"] == "Hồi 1"
    assert data["status"] == "draft"
    assert data["total_pages"] == 0

    # Chặn số chapter <= 0
    bad_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 0, "title": "Lỗi"},
        headers=user1,
    )
    assert bad_res.status_code == 422


def test_duplicate_chapter_number(client, make_user, login) -> None:
    make_user("user2")
    user2 = auth(login("user2"))

    p_res = client.post("/api/v1/projects", json={"name": "Project Dup Test"}, headers=user2)
    project_id = p_res.json()["id"]

    client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Chap 1"},
        headers=user2,
    )

    # Trùng chapter_number 1
    dup_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Chap 1 lần 2"},
        headers=user2,
    )
    assert dup_res.status_code == 409


def test_chapter_permissions(client, make_user, login) -> None:
    make_user("owner_user")
    make_user("stranger_user")
    owner = auth(login("owner_user"))
    stranger = auth(login("stranger_user"))

    p_res = client.post("/api/v1/projects", json={"name": "Private Project"}, headers=owner)
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Chap 1"},
        headers=owner,
    )
    chapter_id = c_res.json()["id"]

    # Người ngoài không xem được project và chapter (404)
    res_list = client.get(f"/api/v1/projects/{project_id}/chapters", headers=stranger)
    assert res_list.status_code == 404

    res_detail = client.get(f"/api/v1/chapters/{chapter_id}", headers=stranger)
    assert res_detail.status_code == 404


def test_soft_delete_chapter(client, make_user, login) -> None:
    make_user("owner_del")
    owner = auth(login("owner_del"))

    p_res = client.post("/api/v1/projects", json={"name": "Project Delete Test"}, headers=owner)
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 10, "title": "Chap 10"},
        headers=owner,
    )
    chapter_id = c_res.json()["id"]

    # Xoá mềm
    del_res = client.delete(f"/api/v1/chapters/{chapter_id}", headers=owner)
    assert del_res.status_code == 204

    # Không còn trong danh sách
    list_res = client.get(f"/api/v1/projects/{project_id}/chapters", headers=owner)
    assert list_res.json()["total"] == 0

    # Cho phép tạo lại chapter mang số 10 sau khi đã xoá chapter cũ
    new_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 10, "title": "Chap 10 mới"},
        headers=owner,
    )
    assert new_res.status_code == 201


def test_upload_images_natural_sort_and_duplicates(client, make_user, login) -> None:
    make_user("uploader")
    uploader = auth(login("uploader"))

    p_res = client.post("/api/v1/projects", json={"name": "Upload Project"}, headers=uploader)
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Upload Chap"},
        headers=uploader,
    )
    chapter_id = c_res.json()["id"]

    img1 = _create_sample_image(120, 180, "blue")
    img2 = _create_sample_image(140, 200, "green")
    img1_duplicate = img1  # trùng hash với img1

    # Đưa danh sách file không theo thứ tự: 10.jpg, 2.jpg, 1.jpg, 1_dup.jpg
    files = [
        ("files", ("10.jpg", io.BytesIO(img2), "image/jpeg")),
        ("files", ("2.jpg", io.BytesIO(img1), "image/jpeg")),
        ("files", ("1.jpg", io.BytesIO(img2), "image/jpeg")),
        ("files", ("1_dup.jpg", io.BytesIO(img1_duplicate), "image/jpeg")),
    ]

    up_res = client.post(f"/api/v1/chapters/{chapter_id}/upload-images", files=files, headers=uploader)
    assert up_res.status_code == 200, up_res.text
    pages = up_res.json()
    assert len(pages) == 4

    # Kiểm tra Natural sort: 1.jpg -> 1_dup.jpg -> 2.jpg -> 10.jpg
    assert pages[0]["original_filename"] == "1.jpg"
    assert pages[0]["page_number"] == 1
    assert pages[1]["original_filename"] == "1_dup.jpg"
    assert pages[2]["original_filename"] == "2.jpg"
    assert pages[3]["original_filename"] == "10.jpg"

    # Kiểm tra cờ trùng hash: 1_dup và 2 có cùng ảnh img1 nên 2.jpg bị đánh dấu trùng
    assert pages[2]["is_duplicate_hash"] is True

    # Kiểm tra trạng thái chapter tự chuyển thành ready
    chap = client.get(f"/api/v1/chapters/{chapter_id}", headers=uploader).json()
    assert chap["total_pages"] == 4
    assert chap["status"] == "ready"


def test_upload_zip_and_filter_junk(client, make_user, login) -> None:
    make_user("zip_user")
    user = auth(login("zip_user"))

    p_res = client.post("/api/v1/projects", json={"name": "Zip Project"}, headers=user)
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 2, "title": "Zip Chap"},
        headers=user,
    )
    chapter_id = c_res.json()["id"]

    img_a = _create_sample_image(100, 100, "yellow")
    img_b = _create_sample_image(100, 100, "purple")
    zip_bytes = _create_sample_zip([("02.png", img_b), ("01.jpg", img_a)])

    up_res = client.post(
        f"/api/v1/chapters/{chapter_id}/upload-zip",
        files={"file": ("comic.zip", io.BytesIO(zip_bytes), "application/zip")},
        headers=user,
    )
    assert up_res.status_code == 200, up_res.text
    pages = up_res.json()
    assert len(pages) == 2
    assert pages[0]["original_filename"] == "01.jpg"
    assert pages[1]["original_filename"] == "02.png"


def test_reorder_and_delete_pages(client, make_user, login) -> None:
    make_user("editor_pages")
    user = auth(login("editor_pages"))

    p_res = client.post("/api/v1/projects", json={"name": "Reorder Project"}, headers=user)
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1},
        headers=user,
    )
    chapter_id = c_res.json()["id"]

    # Upload 3 trang: P1, P2, P3
    img = _create_sample_image(100, 100)
    files = [
        ("files", ("p1.jpg", io.BytesIO(img), "image/jpeg")),
        ("files", ("p2.jpg", io.BytesIO(img), "image/jpeg")),
        ("files", ("p3.jpg", io.BytesIO(img), "image/jpeg")),
    ]
    pages = client.post(f"/api/v1/chapters/{chapter_id}/upload-images", files=files, headers=user).json()
    p1_id, p2_id, p3_id = pages[0]["id"], pages[1]["id"], pages[2]["id"]

    # Đổi thứ tự: P3 lên đầu, rồi đến P1, P2
    reorder_res = client.put(
        f"/api/v1/chapters/{chapter_id}/pages/reorder",
        json={"page_ids": [p3_id, p1_id, p2_id]},
        headers=user,
    )
    assert reorder_res.status_code == 200
    reordered = reorder_res.json()
    assert reordered[0]["id"] == p3_id
    assert reordered[0]["page_number"] == 1
    assert reordered[1]["id"] == p1_id
    assert reordered[1]["page_number"] == 2
    assert reordered[2]["id"] == p2_id
    assert reordered[2]["page_number"] == 3

    # Xoá trang đầu tiên (p3_id, hiện là page_number 1)
    del_res = client.delete(f"/api/v1/chapters/{chapter_id}/pages/{p3_id}", headers=user)
    assert del_res.status_code == 204

    # Kiểm tra các trang còn lại tự dồn số: p1 thành page 1, p2 thành page 2
    remaining = client.get(f"/api/v1/chapters/{chapter_id}/pages", headers=user).json()
    assert len(remaining) == 2
    assert remaining[0]["id"] == p1_id
    assert remaining[0]["page_number"] == 1
    assert remaining[1]["id"] == p2_id
    assert remaining[1]["page_number"] == 2

    # Xoá tất cả trang (Clear all)
    clear_res = client.delete(f"/api/v1/chapters/{chapter_id}/pages", headers=user)
    assert clear_res.status_code == 204

    after_clear = client.get(f"/api/v1/chapters/{chapter_id}/pages", headers=user).json()
    assert len(after_clear) == 0

    chap = client.get(f"/api/v1/chapters/{chapter_id}", headers=user).json()
    assert chap["total_pages"] == 0
    assert chap["status"] == "draft"
