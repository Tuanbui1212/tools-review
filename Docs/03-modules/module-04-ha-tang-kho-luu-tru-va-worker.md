# Module 04: Hạ tầng Kho lưu trữ & Dịch vụ Worker nền

> **Trạng thái:** 📝 **ĐANG ĐẶC TẢ & CHỜ DUYỆT THIẾT KẾ**  
> **Phạm vi:** Kho lưu trữ tập trung (`MinIO` S3) + Hàng đợi nền (`Celery` + `Redis`) + Tiến độ Real-time (`WebSocket` / `Redis PubSub`) + Bảng quản lý nhiệm vụ (`pipeline_tasks`)

---

## 1. Mục tiêu & Bối cảnh

Từ Module 05 trở đi, quy trình sản xuất video chuyển thể truyện tranh sẽ bước vào các công đoạn nặng:
- Cắt khung tranh (tách hàng chục panel/chapter).
- Bóc tách lời thoại và OCR văn bản.
- Gọi AI sinh kịch bản và sinh giọng đọc TTS (có thể mất vài phút/chapter).
- Render video FFmpeg độ phân giải cao.

Nếu thực hiện đồng bộ trên API chính (`main`), request HTTP sẽ bị timeout và làm tê liệt máy chủ. **Module 04** đóng vai trò là "xương sống hạ tầng", cung cấp:
1. **Kho lưu trữ Object Storage chuẩn S3 (MinIO)**: Lưu trữ tập trung ảnh trang, ảnh panel cắt rời, file âm thanh thuyết minh, file subtitle và video hoàn chỉnh; cấp quyền truy cập an toàn bằng Presigned URL.
2. **Hệ thống Worker bất đồng bộ (Celery + Redis)**: Tách việc nặng ra các tiến trình nền chạy độc lập, có thể scale nhiều worker trên nhiều máy tính khác nhau.
3. **Theo dõi tiến độ thời gian thực (Real-time Task Tracking)**: Sử dụng Redis Pub/Sub kết hợp WebSocket trên FastAPI để giao diện Web cập nhật chính xác % tiến độ từng bước mà không cần bấm F5.

---

## 2. Bảng câu hỏi lấy ý kiến & Đề xuất thiết kế (Q&A)

| # | Vấn đề phân vân | Đề xuất giải pháp | Trạng thái chốt |
|---|---|---|---|
| **Q1** | **Xử lý ảnh cũ ở Module 03 (đang lưu ổ cứng server `storage/`)**:<br>Khi bật MinIO S3, ảnh mới sẽ lưu thẳng vào bucket. Còn ảnh cũ của M03 thì xử lý thế nào? | **Đề xuất:** Cung cấp tính năng "Di chuyển lên Cloud" (Sync to MinIO):<br>- Upload mới từ M04 trở đi sẽ đẩy trực tiếp lên MinIO.<br>- Có lệnh CLI `python -m app.cli sync-storage-to-minio` và nút bấm trên giao diện Web để tự động chuyển ảnh cũ từ thư mục local lên bucket MinIO và cập nhật đường dẫn `storage_path` trong DB. | ⏳ Chờ chốt |
| **Q2** | **Công nghệ đẩy tiến độ Real-time về Web**:<br>Nên dùng WebSocket hay Server-Sent Events (SSE)? | **Đề xuất dùng WebSocket kèm Fallback Polling:**<br>- Main API mở endpoint WebSocket `/api/v1/ws/tasks/{task_id}` lắng nghe Redis Pub/Sub channel `channel:task:{task_id}`.<br>- Nếu client mất kết nối WebSocket (do mạng lag hoặc firewall), Web tự động chuyển sang cơ chế Polling `GET /api/v1/tasks/{task_id}` mỗi 2 giây. | ⏳ Chờ chốt |
| **Q3** | **Cấu hình chạy Worker trong môi trường phát triển**:<br>Nên chạy Worker trong Docker Compose cùng Main hay chạy độc lập bên ngoài? | **Đề xuất hỗ trợ cả hai:**<br>1. Thêm service `worker` vào `main/docker-compose.yml` để 1 lệnh `docker compose up -d` là chạy đủ cả Postgres, Redis, MinIO, API, Worker.<br>2. Cung cấp script chạy worker ngoài máy host (`worker/run-worker.bat`) khi dev muốn debug sâu hoặc tận dụng GPU máy thật. | ⏳ Chờ chốt |
| **Q4** | **Phiên bản Docker Image của MinIO**:<br>Image `minio/minio:latest` trên Windows Docker đôi khi bị lỗi instruction AVX hoặc crash phân quyền volume. | **Đề xuất:** Khóa cố định phiên bản MinIO ổn định `minio/minio:RELEASE.2024-05-10T01-41-38Z` với cấu hình volume và cổng 9000 (API), 9001 (Web Console quản trị trực quan). | ⏳ Chờ chốt |

---

## 3. Kiến trúc kỹ thuật chi tiết

### 3.1. Luồng xử lý công việc bất đồng bộ (End-to-End Flow)

```
[Web Client] ──(1) Gửi yêu cầu chạy Task──> [Main API (FastAPI)]
                                                   │
                 ┌─────────────────────────────────┴─────────────────────────────────┐
                 │ (2) Tạo bản ghi Task (PENDING) vào PostgreSQL                     │
                 │ (3) Đẩy task message vào Celery Queue (Redis)                     │
                 └─────────────────────────────────┬─────────────────────────────────┘
                                                   ▼
[Web Client] <──(4) Kết nối WebSocket──────── [Main API]
      │                                            ▲
      │                                            │ (6) Nhận event qua Redis Pub/Sub
      │                                            │
      │                                    [Redis Broker & Pub/Sub]
      │                                            ▲
      │                                            │ (5) Báo tiến độ % (0 -> 100%)
      │                                            │
      │                                    [Celery Worker Service]
      │                                            │
      │                                            ├── Đọc/ghi file ảnh/audio
      │                                            ▼
      └─────────(7) Tải file xem trước trực tiếp ──> [MinIO S3 Storage]
```

### 3.2. Cấu trúc lưu trữ Object Storage (Bucket & Key Naming)

- **Bucket duy nhất**: `crt-files` (hoặc cấu hình qua biến `S3_BUCKET`).
- **Cấu trúc phân cấp Key (Folder ảo)**:
  ```
  projects/{project_id}/chapters/{chapter_id}/
  ├── raw/
  │   ├── page_001.jpg
  │   ├── page_002.jpg
  │   └── ...
  ├── panels/
  │   ├── panel_p001_01.jpg
  │   ├── panel_p001_02.jpg
  │   └── ...
  ├── audio/
  │   ├── line_001_voice.mp3
  │   └── bgm_track.mp3
  └── exports/
      └── chapter_final_1080p.mp4
  ```
- **Bảo mật truy cập**:
  - Không công khai toàn bộ bucket (Private Bucket).
  - Web client truy cập file thông qua **Presigned URL** (URL có chữ ký bảo mật, hết hạn sau 15–60 phút) được sinh tự động bởi Storage Service.

### 3.3. Thiết kế CSDL: Bảng Quản lý Nhiệm vụ nền (`pipeline_tasks`)

Tạo bảng `pipeline_tasks` để theo dõi toàn bộ trạng thái chạy của các công đoạn:

```sql
CREATE TABLE pipeline_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,       -- 'panel_detect', 'ocr', 'script_gen', 'tts', 'video_render'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    current_step VARCHAR(255),            -- 'Đang tách panel trang 5/20', 'Đang đọc OCR...'
    error_message TEXT,
    result_metadata JSONB DEFAULT '{}',   -- Kết quả trả về (thống kê số panel, link output...)
    triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    celery_task_id VARCHAR(100),          -- Mã ID của Celery task để hủy nếu cần
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_pipeline_tasks_chapter ON pipeline_tasks(chapter_id);
CREATE INDEX ix_pipeline_tasks_status ON pipeline_tasks(status);
```

---

## 4. Đặc tả API Endpoints

### 4.1. Nhiệm vụ nền (Tasks)
- `POST /api/v1/projects/{project_id}/chapters/{chapter_id}/tasks/test-run`: Chạy thử nghiệm một task mẫu (Demo Worker & Redis) để kiểm định hạ tầng.
- `GET /api/v1/tasks/{task_id}`: Lấy trạng thái và tiến độ chi tiết của task (cho Polling).
- `POST /api/v1/tasks/{task_id}/cancel`: Hủy bỏ task đang chạy (gửi signal revoke tới Celery).

### 4.2. WebSocket Real-time
- `WS /api/v1/ws/tasks/{task_id}`: Kênh WebSocket đẩy sự kiện tiến độ thời gian thực:
  ```json
  {
    "event": "TASK_PROGRESS",
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "running",
    "progress": 45,
    "step": "Đang tách panel trang 9/20",
    "timestamp": "2026-10-27T16:30:00Z"
  }
  ```

### 4.3. Kho lưu trữ & Hạ tầng (Storage & System)
- `GET /api/health`: Mở rộng kiểm tra sức khỏe gồm: PostgreSQL, Redis, MinIO S3 Storage, Celery Worker.
- `GET /api/v1/storage/presigned-url?key={object_key}`: Lấy Presigned URL xem trực tiếp file trên MinIO.
- `POST /api/v1/storage/migrate-local-files`: Kích hoạt tiến trình di chuyển ảnh lưu ở ổ đĩa local M03 lên MinIO.

---

## 5. Đặc tả Giao diện Web (`web/`)

1. **Thanh trạng thái / Modal tiến trình (Task Progress Tracker)**:
   - Khi người dùng kích hoạt bất kỳ tiến trình nào (hoặc vào xem chapter có task đang chạy): hiển thị thanh tiến trình trực quan với % chạy mượt mà, tên bước hiện tại, và nút "Hủy tác vụ".
   - Tự động chuyển màu xanh khi hoàn tất kèm âm thanh/thông báo Toast, hoặc màu đỏ nếu có lỗi chi tiết.
2. **Tab Giám sát Hạ tầng (System Status View)**:
   - Trong trang Admin / Cài đặt hệ thống: Hiển thị trạng thái các dịch vụ cốt lõi:
     - CSDL PostgreSQL: `Online` (Latency ms).
     - Redis Cache & Broker: `Online`.
     - MinIO Object Storage: `Online` (Dung lượng, Bucket `crt-files`).
     - Celery Worker: `Online` (Số lượng worker đang kết nối, danh sách queue sẵn sàng).
   - Nút "Kiểm tra kết nối" và nút "Đồng bộ ảnh cũ lên MinIO".

---

## 6. Danh sách công việc triển khai (Tasks)

### 6.1. Hạ tầng Docker & Storage
- [ ] Bật service `minio` trong `main/docker-compose.yml` (phiên bản `minio/minio:RELEASE.2024-05-10T01-41-38Z`), tạo bucket `crt-files`.
- [ ] Nâng cấp [`storage.py`](file:///d:/A45043/Project/tools/main/app/integrations/storage.py) hoàn thiện: `upload_file`, `download_file`, `generate_presigned_url`, `delete_file`, `list_objects`.
- [ ] Viết hàm migrate đồng bộ ảnh local M03 lên MinIO S3.

### 6.2. Backend Main API & Database
- [ ] Tạo Migration Alembic bảng `pipeline_tasks`.
- [ ] Tạo Model SQLAlchemy & Pydantic Schema cho `PipelineTask`.
- [ ] Tạo `PipelineTaskRepository` và `PipelineTaskService`.
- [ ] Cấu hình Celery Client trên Main API để gửi task và hủy task qua Redis.
- [ ] Tích hợp WebSocket endpoint `/api/v1/ws/tasks/{task_id}` kết nối Redis Pub/Sub.

### 6.3. Worker Service (`worker/`)
- [ ] Cấu hình Celery worker trong `worker/app/tasks/celery_app.py` với các queue `files`, `ai`, `render`.
- [ ] Viết task mẫu `tasks.test_pipeline_task` mô phỏng tiến độ 0% $\rightarrow$ 100% để kiểm thử toàn diện.
- [ ] Cấu hình Celery publish tiến độ vào Redis Pub/Sub channel sau mỗi bước.

### 6.4. Frontend Web (`web/`)
- [ ] Hook `useTaskProgress(taskId)`: Tự động kết nối WebSocket, fallback polling nếu mất kết nối.
- [ ] Component `TaskProgressBar`: Thanh tiến trình % động kèm thông báo bước xử lý.
- [ ] Cập nhật trang `SystemStatusPage`: Hiển thị trạng thái MinIO và Celery Worker sống động.

---

## 7. Tiêu chí nghiệm thu (Acceptance Criteria)

| # | Tiêu chí nghiệm thu | Kết quả |
|---|---|---|
| **A1** | Khởi động Docker Compose: MinIO, Redis, PostgreSQL, Main API, Worker đều chạy ở trạng thái Healthy | ⬜ |
| **A2** | Endpoint `/api/health` trả về `healthy` cho cả 4 dịch vụ (db, redis, storage, worker) | ⬜ |
| **A3** | Upload 1 file ảnh lên MinIO thông qua Storage Service và sinh Presigned URL mở xem được trên trình duyệt | ⬜ |
| **A4** | Gửi task mẫu từ Main API sang Celery Worker qua queue Redis thành công | ⬜ |
| **A5** | Worker nhận task, xử lý và bắn các sự kiện tiến độ (10%, 30%, ..., 100%) vào Redis Pub/Sub | ⬜ |
| **A6** | Web Client kết nối WebSocket nhận được các event tiến trình và thanh progress bar trên giao diện chạy từ 0% lên 100% không giật lag | ⬜ |
| **A7** | Chức năng hủy task (Cancel): Khi bấm hủy trên Web, Celery dừng task ngay lập tức và trạng thái đổi thành `cancelled` | ⬜ |
| **A8** | Cơ chế Fallback: Nếu tắt WebSocket, Web vẫn cập nhật được tiến độ qua Polling REST API | ⬜ |
| **A9** | Di chuyển dữ liệu: Chạy công cụ đồng bộ thành công các ảnh từ M03 lên bucket MinIO | ⬜ |
| **A10**| Typecheck và Build Frontend Web 100% sạch, không lỗi | ⬜ |

---

## 8. Xác nhận nghiệm thu

- **Người duyệt đặc tả:** Chủ dự án
- **Ngày duyệt:** 2026-10-27
- **Trạng thái:** 📝 **CHỜ Ý KIẾN PHẢN HỒI BẢNG Q&A TỪ CHỦ DỰ ÁN**
