# Module 05: Tự động Cắt khung tranh & Biên tập Panel (Panel Extraction & Editor)

> **Trạng thái:** 📝 **ĐẶC TẢ CHI TIẾT & KẾ HOẠCH TRIỂN KHAI**  
> **Công đoạn Pipeline:** S3 (Tách panel & Xác định thứ tự đọc truyện)  
> **Phạm vi:** Worker AI (`worker-ai/`) + Main Backend API (`main/`) + Giao diện Web Canvas (`web/`)  
> **Branch:** `feature/module-05-panel-extraction`

---

## 1. Bảng Q&A Quyết định Thiết kế (Thảo luận & Đề xuất)

| # | Vấn đề kỹ thuật | Đề xuất giải pháp tối ưu | Lý do & Lợi ích |
|---|---|---|---|
| **Q1** | **Thuật toán / AI Model nhận diện khung tranh** | **Kết hợp Hybrid: Thuật toán Contour OpenCV + Fallback Model AI (YOLO-manga)** | • **OpenCV Contour (chính):** Cực nhẹ, chạy siêu nhanh (50-100ms/trang), phát hiện chuẩn 90% các trang truyện có viền/khoảng trắng rãnh phân tách (gutter).<br>• **YOLOv8-manga (bổ trợ):** Dành cho các khung tranh phức tạp, tranh tràn viền (borderless) hoặc trang không có rãnh rõ ràng.<br>• Không cần GPU khủng, máy thường cũng chạy mượt mà. |
| **Q2** | **Nơi lưu trữ ảnh panel sau khi cắt** | **Lưu Local Cache + Tự động đẩy lên Google Drive** | Lưu vào thư mục tương ứng trên Google Drive: `[Project] / Chapter X / 02_panels/page_001_panel_01.jpg` để đồng bộ dữ liệu đám mây, đồng thời lưu đĩa tạm trên server để phục vụ xử lý OCR ở Module 06. |
| **Q3** | **Thuật toán sắp xếp thứ tự đọc (Reading Order)** | **Theo hướng đọc cấu hình của Dự án (`reading_direction`)** | • **`rtl` (Manga Nhật):** Sắp xếp từ **Trên xuống Dưới**, trong cùng 1 hàng thì từ **Phải sang Trái**.<br>• **`ltr` (Comic phương Tây / Manhua ngang):** Từ **Trên xuống Dưới**, trong cùng 1 hàng thì từ **Trái sang Phải**.<br>• **`vertical` (Webtoon):** Chỉ đơn giản sắp xếp theo toạ độ trục Y từ **Trên xuống Dưới**. |
| **Q4** | **Trang bìa, trang màu, hoặc tranh đôi tràn 2 trang** | **Hỗ trợ cờ đánh dấu "Toàn trang" (Full-page / Splash Art)** | Cho phép người dùng hoặc hệ thống gắn cờ 1 bức tranh là "Toàn trang", khi đó toạ độ panel chính là toàn bộ kích thước của trang truyện đó, không cần cắt nhỏ. |
| **Q5** | **Giao diện Web biên tập Panel** | **Web Canvas tương tác trực quan (Konva.js / Fabric.js / HTML5 Canvas)** | Cho phép kéo rê chuột di chuyển khung, kéo 8 điểm neo để co giãn (resize), vẽ thêm khung mới bằng cách quét chuột, và bấm số để đổi lại thứ tự đọc 1, 2, 3... cực kỳ tiện lợi. |

---

## 2. Mục tiêu cốt lõi của Module 05

1. **Tự động hoá tối đa:** Người dùng bấm *"Bắt đầu cắt khung tranh"* $\rightarrow$ Task được đẩy vào `ai_queue` của `worker-ai` $\rightarrow$ Tự động bóc tách toàn bộ 20–50 trang truyện chỉ trong 10–20 giây.
2. **Tiến độ Real-time:** Nhận event qua WebSocket từ Redis Pub/Sub, hiển thị thanh tiến độ: `Đang cắt trang 5/24... (30%)`.
3. **Công cụ can thiệp thủ công (Human-in-the-loop):** AI không bao giờ đúng 100%, do đó giao diện Web Canvas cho phép người dùng xem lại, sửa nhanh các khung nhận diện lệch hoặc đổi thứ tự đọc trước khi bấm duyệt.

---

## 3. Kiến trúc Luồng dữ liệu (Data Flow)

```
[Web Client] ──(1) Bấm "Cắt khung tranh"──> [Main API] ──(2) Tạo PipelineTask (ai_queue)──> [Redis Broker]
                                                                                                    │
[Web Client] <──(5) WebSocket báo tiến độ % <── [Redis Pub/Sub] <──(4) Báo % tiến độ ─────────── [worker-ai]
                                                                                                    │ (3) Đọc ảnh gốc
                                                                                                    ▼
[Web Client] <──(7) Xem & Sửa Canvas ──── [Main API] <──(6) Lưu toạ độ & đẩy ảnh panel ──── [Google Drive]
```

---

## 4. Thiết kế Cơ sở Dữ liệu: Bảng `chapter_panels`

Thêm bảng `chapter_panels` vào PostgreSQL (Migration `0006_chapter_panels`):

```sql
CREATE TABLE chapter_panels (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    chapter_page_id BIGINT NOT NULL REFERENCES chapter_pages(id) ON DELETE CASCADE,
    
    panel_number INT NOT NULL,              -- Thứ tự đọc (1, 2, 3...) trong toàn bộ chapter
    panel_index_in_page INT NOT NULL,      -- Thứ tự panel trong riêng trang đó (1, 2, 3...)
    
    -- Toạ độ Bounding Box chuẩn hoá (dưới dạng tỉ lệ 0.0 -> 1.0 hoặc pixel tuyệt đối)
    bbox_x INT NOT NULL,                   -- Toạ độ X góc trên bên trái (pixel)
    bbox_y INT NOT NULL,                   -- Toạ độ Y góc trên bên trái (pixel)
    bbox_width INT NOT NULL,               -- Chiều rộng khung cắt (pixel)
    bbox_height INT NOT NULL,              -- Chiều cao khung cắt (pixel)
    
    -- Đường dẫn lưu file ảnh đã cắt
    image_path TEXT,                       -- Đường dẫn local cache
    google_drive_file_id VARCHAR(128),     -- ID file ảnh panel trên Google Drive
    
    is_full_page BOOLEAN DEFAULT FALSE,    -- Có phải tranh toàn trang không
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_chapter_panel_number UNIQUE (chapter_id, panel_number)
);

CREATE INDEX ix_chapter_panels_page ON chapter_panels(chapter_page_id);
CREATE INDEX ix_chapter_panels_chapter ON chapter_panels(chapter_id, panel_number);
```

---

## 5. Danh sách API Backend cần xây dựng

### 5.1. Kích hoạt & Điều phối tác vụ
* `POST /api/v1/chapters/{chapter_id}/extract-panels`  
  * Đẩy task `ai.extract_panels` vào `ai_queue` của `worker-ai`.
  * Trả về `task_id` để FE lắng nghe WebSocket.
* `POST /api/v1/chapter-pages/{page_id}/extract-panels`  
  * Cắt lại riêng cho 1 trang duy nhất khi người dùng yêu cầu.

### 5.2. Quản lý & Biên tập Panel
* `GET /api/v1/chapters/{chapter_id}/panels`  
  * Lấy toàn bộ danh sách panel đã cắt của Chapter kèm toạ độ và URL ảnh.
* `GET /api/v1/chapter-pages/{page_id}/panels`  
  * Lấy danh sách panel của riêng 1 trang (để render lên Web Canvas).
* `PUT /api/v1/chapter-pages/{page_id}/panels`  
  * Lưu lại toàn bộ danh sách bounding box sau khi người dùng sửa trên Canvas (cập nhật toạ độ, thêm box mới, xoá box).
* `PUT /api/v1/chapters/{chapter_id}/panels/reorder`  
  * Cập nhật lại số thứ tự đọc `panel_number` của các panel trong chapter.

---

## 6. Thiết kế Giao diện Web: Panel Canvas Editor

Giao diện biên tập panel sẽ nằm tại tab **"Cắt khung tranh"** trong trang Chapter (`/projects/:id/chapters/:chapterId`):

1. **Thanh công cụ đỉnh (Header Action Bar):**
   * Nút *"Tự động nhận diện toàn bộ"* (kèm thanh progress bar tiến độ WebSocket).
   * Nút *"Thêm khung mới"* (vẽ thủ công).
   * Nút *"Đánh lại số thứ tự tự động"*.
   * Nút *"Lưu thay đổi"*.
2. **Cột trái - Danh sách trang truyện (Page Filmstrip):**
   * Cuộn dọc danh sách các trang gốc, có huy hiệu số lượng panel đã nhận diện (ví dụ: `Trang 1: 5 panel`).
   * Bấm vào trang nào thì Canvas ở giữa tải trang đó lên.
3. **Khu vực trung tâm - Canvas vẽ tương tác:**
   * Hiển thị ảnh trang truyện độ phân giải cao.
   * Vẽ đè các khung chữ nhật bán trong suốt (Semi-transparent Rectangles) có màu sắc nổi bật.
   * Góc mỗi khung có nhãn số thứ tự: `#1`, `#2`, `#3`...
   * Hỗ trợ kéo di chuyển, co giãn viền, xoá (nút Delete hoặc icon thùng rác).
4. **Cột phải - Danh sách thumbnail panel đã cắt:**
   * Hiển thị các mảnh ảnh panel sau khi cắt thực tế để kiểm tra trước kết quả.

---

## 7. Kế hoạch triển khai cuốn chiếu (Implementation Roadmap)

| Giai đoạn | Nội dung công việc chi tiết | Dự kiến bàn giao |
|---|---|---|
| **Phase 1: Thuật toán Worker AI** | • Viết thuật toán cắt khung tranh bằng OpenCV (Morphology + Contour Filtering) trong `worker-ai`.<br>• Viết hàm tính toán thứ tự đọc (`rtl`, `ltr`, `vertical`).<br>• Task Celery `ai.extract_panels` nhận task, cắt ảnh, đẩy lên Google Drive và báo tiến độ qua Redis Pub/Sub. | Ngày 1 |
| **Phase 2: Database & Backend API** | • Migration `0006_chapter_panels` trong `main`.<br>• Model, Repository, Service cho `ChapterPanel`.<br>• Các endpoint API: trigger cắt khung, lấy danh sách, cập nhật toạ độ và reorder panel. | Ngày 1 |
| **Phase 3: Giao diện Web Canvas** | • Xây dựng Canvas Editor component trên React (vẽ box, resize, di chuyển, zoom).<br>• Kết nối WebSocket nhận % tiến độ khi đang chạy cắt tự động.<br>• Thao tác chỉnh sửa, đổi thứ tự và xem preview các mảnh panel đã cắt. | Ngày 2 |
| **Phase 4: Kiểm thử & Nghiệm thu** | • Test trên bộ 24 trang One Piece Chapter 2 đã tải.<br>• Đánh giá độ chính xác thuật toán cắt và độ mượt mà của Web Canvas.<br>• Nghiệm thu hoàn thành Module 05. | Ngày 2 |
