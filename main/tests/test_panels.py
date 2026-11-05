import io
from PIL import Image

from conftest import auth


def _create_sample_image(width: int = 100, height: int = 150, color: str = "white") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_panels_full_lifecycle(client, make_user, login) -> None:
    make_user("panel_user")
    user_headers = auth(login("panel_user"))

    # 1. Tạo project và chapter
    p_res = client.post("/api/v1/projects", json={"name": "Project Panel Test"}, headers=user_headers)
    assert p_res.status_code == 201
    project_id = p_res.json()["id"]

    c_res = client.post(
        f"/api/v1/projects/{project_id}/chapters",
        json={"chapter_number": 1, "title": "Chap 1 Panel"},
        headers=user_headers,
    )
    assert c_res.status_code == 201
    chapter_id = c_res.json()["id"]

    # 2. Upload 2 trang ảnh
    img1 = _create_sample_image(100, 150, "blue")
    img2 = _create_sample_image(100, 150, "green")
    up_res = client.post(
        f"/api/v1/chapters/{chapter_id}/upload-images",
        files=[("files", ("01.jpg", img1, "image/jpeg")), ("files", ("02.jpg", img2, "image/jpeg"))],
        headers=user_headers,
    )
    assert up_res.status_code == 200
    pages = up_res.json()
    assert len(pages) == 2
    page1_id = pages[0]["id"]
    page2_id = pages[1]["id"]

    # 3. Kích hoạt trigger extract panels
    trig_res = client.post(
        f"/api/v1/chapters/{chapter_id}/extract-panels",
        headers=user_headers,
    )
    assert trig_res.status_code == 200
    task_data = trig_res.json()
    assert task_data["task_type"] == "ai.extract_panels"
    assert task_data["queue_name"] == "ai_queue"

    # Kiểm tra trạng thái chapter đã đổi sang processing
    chap_check = client.get(f"/api/v1/chapters/{chapter_id}", headers=user_headers).json()
    assert chap_check["status"] == "processing"

    # 4. Worker AI gọi internal API lưu kết quả bóc tách
    worker_batch_data = [
        {
            "chapter_page_id": page1_id,
            "panel_number": 1,
            "panel_index_in_page": 1,
            "bbox_x": 0,
            "bbox_y": 0,
            "bbox_width": 100,
            "bbox_height": 70,
            "is_full_page": False,
        },
        {
            "chapter_page_id": page1_id,
            "panel_number": 2,
            "panel_index_in_page": 2,
            "bbox_x": 0,
            "bbox_y": 75,
            "bbox_width": 100,
            "bbox_height": 75,
            "is_full_page": False,
        },
        {
            "chapter_page_id": page2_id,
            "panel_number": 3,
            "panel_index_in_page": 1,
            "bbox_x": 0,
            "bbox_y": 0,
            "bbox_width": 100,
            "bbox_height": 150,
            "is_full_page": True,
        },
    ]

    save_res = client.post(
        f"/api/v1/internal/chapters/{chapter_id}/panels/batch",
        json=worker_batch_data,
    )
    assert save_res.status_code == 201
    saved_panels = save_res.json()
    assert len(saved_panels) == 3

    # Kiểm tra trạng thái chapter đã chuyển về ready sau khi cắt xong
    chap_check = client.get(f"/api/v1/chapters/{chapter_id}", headers=user_headers).json()
    assert chap_check["status"] == "ready"

    # 5. Lấy danh sách panel của chapter
    list_res = client.get(f"/api/v1/chapters/{chapter_id}/panels", headers=user_headers)
    assert list_res.status_code == 200
    chapter_panels = list_res.json()
    assert len(chapter_panels) == 3
    assert chapter_panels[0]["panel_number"] == 1
    assert chapter_panels[1]["panel_number"] == 2
    assert chapter_panels[2]["panel_number"] == 3
    assert "/panels/" in chapter_panels[0]["image_url"]

    # 6. Lấy danh sách panel của riêng trang 1
    p1_res = client.get(f"/api/v1/chapter-pages/{page1_id}/panels", headers=user_headers)
    assert p1_res.status_code == 200
    assert len(p1_res.json()) == 2

    # 7. Người dùng sửa trên Web Canvas cho trang 1 (gộp thành 1 box duy nhất)
    edit_res = client.put(
        f"/api/v1/chapter-pages/{page1_id}/panels",
        json={
            "panels": [
                {
                    "panel_index_in_page": 1,
                    "bbox_x": 5,
                    "bbox_y": 5,
                    "bbox_width": 90,
                    "bbox_height": 140,
                    "is_full_page": False,
                }
            ]
        },
        headers=user_headers,
    )
    assert edit_res.status_code == 200
    new_p1 = edit_res.json()
    assert len(new_p1) == 1
    assert new_p1[0]["bbox_x"] == 5

    # 8. Kiểm tra lại toàn bộ chapter: tổng số panel còn 2 (trang 1 có 1, trang 2 có 1)
    list_res_after = client.get(f"/api/v1/chapters/{chapter_id}/panels", headers=user_headers).json()
    assert len(list_res_after) == 2
    assert list_res_after[0]["panel_number"] == 1
    assert list_res_after[1]["panel_number"] == 2

    # 9. Test đổi thứ tự đọc (Reorder)
    reorder_res = client.put(
        f"/api/v1/chapters/{chapter_id}/panels/reorder",
        json={"panel_ids": [list_res_after[1]["id"], list_res_after[0]["id"]]},
        headers=user_headers,
    )
    assert reorder_res.status_code == 200
    reordered_panels = reorder_res.json()
    assert reordered_panels[0]["id"] == list_res_after[1]["id"]
    assert reordered_panels[0]["panel_number"] == 1
    assert reordered_panels[1]["id"] == list_res_after[0]["id"]
    assert reordered_panels[1]["panel_number"] == 2

    # 10. Test internal endpoint lưu panel từng trang (như Worker AI gọi)
    single_save_res = client.put(
        f"/api/v1/internal/chapters/{chapter_id}/pages/{page1_id}/panels",
        json={
            "panels": [
                {
                    "panel_index_in_page": 1,
                    "bbox_x": 0,
                    "bbox_y": 0,
                    "bbox_width": 50,
                    "bbox_height": 50,
                    "image_path": "/tmp/test.jpg",
                }
            ]
        },
    )
    assert single_save_res.status_code == 200
    single_saved = single_save_res.json()
    assert len(single_saved) == 1
    assert single_saved[0]["image_path"] == "/tmp/test.jpg"


