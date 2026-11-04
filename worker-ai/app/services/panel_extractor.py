from collections import defaultdict
import io
import os
from typing import Any

import cv2
import numpy as np
from PIL import Image


class PanelExtractorService:
    """Service thuật toán nhận diện và bóc tách khung tranh (Panel Extraction).

    Kết hợp:
    1. Projection Profile Gutter Analysis (Phân tích rãnh trắng chuẩn theo hàng và cột)
    2. Contour / Morphological Fallback (Dành cho trang có bố cục đặc biệt)
    3. Tự động xác định tranh toàn trang (Full-page Splash Art)
    4. Sắp xếp thứ tự đọc theo hướng đọc: 'rtl' (Manga), 'ltr' (Comic), 'vertical' (Webtoon)
    """

    def detect_and_crop_panels(
        self,
        image_bytes: bytes,
        reading_direction: str = "rtl",
        output_dir: str | None = None,
        prefix: str = "panel",
    ) -> list[dict[str, Any]]:
        """Nhận diện toạ độ các panel và crop ra ảnh tương ứng."""
        # Đọc ảnh từ bytes
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Không thể giải mã dữ liệu ảnh")

        h, w = img.shape[:2]
        boxes = self._extract_bounding_boxes(img, reading_direction)

        panels_result: list[dict[str, Any]] = []
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        for idx, (bx, by, bw, bh, is_full) in enumerate(boxes, start=1):
            # Cắt ảnh panel
            cropped_img = img[by : by + bh, bx : bx + bw]

            # Encode thành JPEG
            success, encoded_jpg = cv2.imencode(".jpg", cropped_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            cropped_bytes = encoded_jpg.tobytes() if success else b""

            file_path = None
            if output_dir:
                filename = f"{prefix}_{idx:02d}.jpg"
                file_path = os.path.join(output_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(cropped_bytes)

            panels_result.append(
                {
                    "panel_index_in_page": idx,
                    "bbox_x": int(bx),
                    "bbox_y": int(by),
                    "bbox_width": int(bw),
                    "bbox_height": int(bh),
                    "is_full_page": is_full,
                    "image_bytes": cropped_bytes,
                    "image_path": file_path,
                }
            )

        return panels_result

    def _extract_bounding_boxes(
        self,
        img: np.ndarray,
        reading_direction: str = "rtl",
    ) -> list[tuple[int, int, int, int, bool]]:
        """Trả về danh sách (x, y, w, h, is_full_page) đã sắp xếp theo chiều đọc."""
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Thử thuật toán Gutter Projection
        boxes = self._gutter_projection_detect(gray, w, h)

        # 2. Nếu không tìm thấy hoặc chỉ ra 1 khung rất nhỏ, thử Contour Fallback
        if not boxes:
            boxes = self._contour_detect_fallback(gray, w, h)

        # 3. Nếu vẫn không thấy, coi như Full Page (trang bìa hoặc toàn cảnh)
        if not boxes:
            return [(0, 0, w, h, True)]

        # 4. Sắp xếp thứ tự đọc
        return self._sort_reading_order(boxes, w, h, reading_direction)

    def _gutter_projection_detect(
        self,
        gray: np.ndarray,
        w: int,
        h: int,
    ) -> list[tuple[int, int, int, int]]:
        _, binary = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)

        row_white_ratio = np.mean(binary == 255, axis=1)
        is_gutter_row = row_white_ratio > 0.96

        panel_row_bands: list[tuple[int, int]] = []
        in_band = False
        start_y = 0
        min_band_height = int(h * 0.04)

        for y in range(h):
            if not is_gutter_row[y]:
                if not in_band:
                    start_y = y
                    in_band = True
            else:
                if in_band:
                    if (y - start_y) >= min_band_height:
                        panel_row_bands.append((start_y, y))
                    in_band = False
        if in_band and (h - start_y) >= min_band_height:
            panel_row_bands.append((start_y, h))

        boxes: list[tuple[int, int, int, int]] = []
        min_panel_w = int(w * 0.08)

        for y1, y2 in panel_row_bands:
            band_binary = binary[y1:y2, :]
            col_white_ratio = np.mean(band_binary == 255, axis=0)
            is_gutter_col = col_white_ratio > 0.96

            in_col = False
            start_x = 0
            for x in range(w):
                if not is_gutter_col[x]:
                    if not in_col:
                        start_x = x
                        in_col = True
                else:
                    if in_col:
                        if (x - start_x) >= min_panel_w:
                            boxes.append((start_x, y1, x - start_x, y2 - y1))
                        in_col = False
            if in_col and (w - start_x) >= min_panel_w:
                boxes.append((start_x, y1, w - start_x, y2 - y1))

        return boxes

    def _contour_detect_fallback(
        self,
        gray: np.ndarray,
        w: int,
        h: int,
    ) -> list[tuple[int, int, int, int]]:
        total_area = w * h
        _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

        kernel_size = max(5, int(min(w, h) * 0.015))
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes: list[tuple[int, int, int, int]] = []

        min_w = int(w * 0.08)
        min_h = int(h * 0.06)
        min_area = total_area * 0.02
        max_area = total_area * 0.98

        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            area = bw * bh
            if bw >= min_w and bh >= min_h and min_area <= area <= max_area:
                boxes.append((x, y, bw, bh))

        return boxes

    def _sort_reading_order(
        self,
        boxes: list[tuple[int, int, int, int]],
        w: int,
        h: int,
        reading_direction: str,
    ) -> list[tuple[int, int, int, int, bool]]:
        """Sắp xếp các box theo hướng đọc."""
        if len(boxes) == 1 and boxes[0][2] >= int(w * 0.9) and boxes[0][3] >= int(h * 0.9):
            return [(boxes[0][0], boxes[0][1], boxes[0][2], boxes[0][3], True)]

        if reading_direction == "vertical":
            # Webtoon cuộn dọc: Sắp xếp đơn giản theo y tăng dần
            sorted_boxes = sorted(boxes, key=lambda b: b[1])
            return [(b[0], b[1], b[2], b[3], False) for b in sorted_boxes]

        # Gom hàng theo trục Y (khoảng cách sai số trong 5% chiều cao)
        row_band_threshold = int(h * 0.05)
        boxes_by_y = sorted(boxes, key=lambda b: b[1])
        rows: list[list[tuple[int, int, int, int]]] = []

        for b in boxes_by_y:
            placed = False
            for r in rows:
                row_y_center = np.mean([item[1] + item[3] / 2 for item in r])
                b_y_center = b[1] + b[3] / 2
                if abs(row_y_center - b_y_center) <= row_band_threshold:
                    r.append(b)
                    placed = True
                    break
            if not placed:
                rows.append([b])

        result: list[tuple[int, int, int, int, bool]] = []
        for r in rows:
            if reading_direction == "rtl":
                # Manga Nhật: Phải sang Trái (x giảm dần)
                r.sort(key=lambda b: b[0], reverse=True)
            else:
                # Comic / Manhua: Trái sang Phải (x tăng dần)
                r.sort(key=lambda b: b[0])
            for b in r:
                result.append((b[0], b[1], b[2], b[3], False))

        return result

