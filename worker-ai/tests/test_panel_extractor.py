import numpy as np
import cv2
import pytest
from app.services.panel_extractor import PanelExtractorService


def test_panel_extractor_synthetic_panels():
    # Tạo ảnh trắng 800x1200 với 3 ô tranh đen viền rãnh trắng
    img = np.ones((1200, 800, 3), dtype=np.uint8) * 255

    # Panel 1 (trên cùng)
    cv2.rectangle(img, (50, 50), (750, 350), (20, 20, 20), -1)
    # Panel 2 (dưới bên phải - manga đọc trước)
    cv2.rectangle(img, (420, 400), (750, 1150), (20, 20, 20), -1)
    # Panel 3 (dưới bên trái - manga đọc sau)
    cv2.rectangle(img, (50, 400), (380, 1150), (20, 20, 20), -1)

    _, encoded = cv2.imencode(".png", img)
    image_bytes = encoded.tobytes()

    service = PanelExtractorService()
    panels = service.detect_and_crop_panels(image_bytes, reading_direction="rtl")

    assert len(panels) == 3
    # Panel 1 phải ở trên cùng
    assert panels[0]["bbox_y"] < 200
    # Trong 2 panel dưới, với reading_direction="rtl", panel bên phải (x lớn hơn) phải đọc trước
    assert panels[1]["bbox_x"] > panels[2]["bbox_x"]


def test_panel_extractor_full_page_fallback():
    # Ảnh trắng trơn hoặc tranh toàn trang không viền rãnh rõ rệt
    img = np.ones((1000, 700, 3), dtype=np.uint8) * 128
    _, encoded = cv2.imencode(".png", img)
    image_bytes = encoded.tobytes()

    service = PanelExtractorService()
    panels = service.detect_and_crop_panels(image_bytes, reading_direction="rtl")

    assert len(panels) == 1
    assert panels[0]["is_full_page"] is True
    assert panels[0]["bbox_width"] == 700
    assert panels[0]["bbox_height"] == 1000
