# Tech stack

> Trạng thái: **APPROVED** — D033–D038.

## Bộ 3 chính

| Tầng | Công nghệ | Dùng cho |
|---|---|---|
| **Backend** | **Python + FastAPI** | Main (`main/`) và engine trong App (`client/app/engine/`) |
| **Database** | **PostgreSQL** (+ pgvector) | DB trung tâm trên server |
| **Frontend** | **React + TypeScript** | Web (`client/web/`) và giao diện App (`client/app/ui/`), dùng chung `client/shared/` |

Engine trong App cũng viết bằng Python, nên **server và engine chung một ngôn ngữ**: dùng lại được kiểu dữ liệu, cách kiểm tra setting và code gọi API.

## Chi tiết từng tầng

### Backend — Python

| Phần | Công nghệ | Lý do |
|---|---|---|
| Phiên bản | Python 3.12 | Ổn định, PyTorch / CUDA hỗ trợ tốt (engine cần) |
| Web framework | FastAPI | Nhanh, tự sinh tài liệu API, có WebSocket để đẩy tiến độ |
| Kiểm tra dữ liệu | Pydantic v2 | Đi kèm FastAPI; dùng luôn cho schema setting |
| ORM | SQLAlchemy 2 | Phổ biến nhất Python |
| Migration | Alembic | Đi cùng SQLAlchemy |
| Driver DB | psycopg 3 | Driver PostgreSQL chính thức thế hệ mới |
| Chạy server | Uvicorn | |
| Tài liệu API | Swagger UI có sẵn của FastAPI (`/docs`, `/redoc`) | D037 |
| Việc chạy nền | Celery | Gọi AI trả phí, xử lý file, việc định kỳ, thông báo (D036) |
| Việc định kỳ | Celery Beat | Mở khoá chapter hết hạn, tổng hợp chi phí, dọn file |
| Theo dõi job | Flower | Trang xem job Celery cho admin |
| Lưu file | MinIO + boto3 | Chuẩn S3, đổi sang cloud chỉ cần đổi cấu hình (D038) |
| Quản lý package | uv | Nhanh, khoá phiên bản chính xác |
| Test | pytest | |

### Database

| Phần | Công nghệ |
|---|---|
| DB | PostgreSQL 17 |
| Vector | pgvector (embedding nhân vật, dùng từ M08) |
| Redis | Hàng đợi Celery, đẩy tiến độ qua WebSocket, cache |

### Frontend — React

| Phần | Công nghệ | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript | Bắt lỗi sớm, dễ bảo trì |
| Framework | React + Vite | |
| Thư viện UI | Ant Design | Mạnh về bảng, form, phù hợp quản lý |
| Gọi API | TanStack Query | Cache, tự tải lại, xử lý loading/lỗi |
| Router | React Router | |
| Vẽ trên ảnh | Konva (từ M06) | Khung panel, khung mặt |
| Đóng gói App | Electron (M14) | Giai đoạn đầu App chạy dạng web local (D022) |
| Quản lý package | pnpm (workspace) | Quản lý chung `web`, `app/ui`, `shared` |
| Node.js | bản LTS | |

### Engine trong App — Python (thư viện AI chọn trong từng module)

| Phần | Công nghệ |
|---|---|
| AI local | PyTorch + CUDA (GPU NVIDIA, D020) |
| Xử lý ảnh | OpenCV, Pillow |
| Video / audio | ffmpeg |
| Hàng đợi việc local | Hàng đợi nhẹ lưu bằng SQLite, chạy trong engine (không dùng Celery, D036) — chốt ở M03 |
| File local | Thư mục làm việc theo project/chapter + SQLite ghi trạng thái file (D038) |
| Model cụ thể | Chọn khi làm M06–M10, sau khi thử trên chapter mẫu |

## Môi trường & công cụ chung

| Phần | Đề xuất |
|---|---|
| Quản lý code | Một repo git chung: `Docs/`, `main/`, `client/` (D042) |
| Dịch vụ khi phát triển | Docker Desktop + Docker Compose (D035). `main/docker-compose.yml`: `postgres`, `redis`, `minio`, `api`. `worker/docker-compose.yml`: `worker-api`, `celery-worker`, `celery-beat`, `flower` |
| Kiến trúc code | Microservice FastAPI, BE layer, FE feature: [code-structure.md](code-structure.md) |
| Triển khai server | Docker Compose |
| Format / lint Python | ruff |
| Format / lint TypeScript | ESLint + Prettier |

Số phiên bản chính xác của từng thư viện chốt lúc dựng M01, ghi vào file khoá phiên bản (`uv.lock`, `pnpm-lock.yaml`).
