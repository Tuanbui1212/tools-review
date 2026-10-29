# Danh sách port

> Trạng thái: **REVIEW** — đúng với code hiện tại (sau M01). Thêm service mới thì cập nhật file này.

## Tổng quan

| Port | Service | Chạy ở | Folder | Dùng để |
|---|---|---|---|---|
| **8000** | `api` — Main API (FastAPI) | Main server | `main/` | API cho Web và App. Swagger: `/docs`, ReDoc: `/redoc`, health: `/api/health` |
| **5432** | `postgres` — PostgreSQL 17 + pgvector | Main server | `main/` | Database chính (`crt`). Test dùng database `crt_test` trên cùng port |
| **6379** | `redis` — Redis 7.4 | Main server | `main/` | Hàng đợi task (Celery broker), kết quả task |
| **9000** | `minio` — kho file, API S3 | Main server | `main/` | Lưu file dùng chung (ảnh, audio, video) ⚠️ |
| **9001** | `minio` — trang quản trị | Main server | `main/` | Xem / quản lý file bằng trình duyệt ⚠️ |
| **8100** | `worker-api` — Worker API (FastAPI) | Worker server | `worker/` | Health của worker. Swagger: `/docs` |
| **5555** | `flower` — Flower | Worker server | `worker/` | Theo dõi job Celery |
| — | `celery-worker`, `celery-beat` | Worker server | `worker/` | Không mở port; nhận task qua Redis (6379) |
| **3000** | Web (Vite dev server) | Máy dev | `client/web/` | Giao diện Web quản lý |
| **3001** | App UI (Vite dev server) | Máy dev / máy người dùng | `client/app/ui/` | Giao diện App (dạng web local, D022) |
| **8200** | Engine local (FastAPI) | Máy người dùng | `client/app/engine/` | API kiểm tra phần cứng, GPU, runner local |

⚠️ **MinIO hiện không tải được image** (xem [M01 notes](../../03-modules/M01-backend-foundation/notes.md)). Tạm giữ nguyên trong cấu hình; **sửa khi bắt đầu dùng kho file ở M05** (D050). Nếu đổi sang kho S3 khác thì port đổi theo, ví dụ SeaweedFS dùng **8333** cho API S3.

## Ai gọi tới ai

```
Trình duyệt ──► 3000 (Web)  ──proxy /api──┐
Trình duyệt ──► 3001 (App)  ──proxy /api──┤
                                          ▼
                                   8000 Main API ──► 5432 PostgreSQL
                                          │      ──► 6379 Redis (đẩy task)
                                          │      ──► 9000 kho file
                                          ▼
Worker server: celery-worker ──► 6379 Redis (nhận task)
                             ──► 8000 Main API (lấy dữ liệu / báo kết quả)
                             ──► 9000 kho file
```

- Khi phát triển, Web và App gọi `/api/...` vào chính port 3000 / 3001; Vite chuyển tiếp sang **8000**. Cấu hình ở `vite.config.ts`.
- Worker chạy cùng máy với Main khi phát triển nên kết nối qua `host.docker.internal` (xem `worker/.env.example`).

## Khi triển khai thật (đề xuất)

| Port | Mở ra internet? |
|---|---|
| 443 (HTTPS) → 8000 | **Có**, qua reverse proxy (nginx) |
| 5432, 6379, 9000 | **Không**. Chỉ mở cho Worker server (mạng nội bộ / VPN / firewall theo IP) |
| 9001, 5555, 8100 | **Không**. Chỉ admin truy cập qua mạng nội bộ / VPN |

## Đổi port

| Muốn đổi | Sửa ở |
|---|---|
| Port phía máy host của Main | `ports:` trong `main/docker-compose.yml` |
| Port phía máy host của Worker | `ports:` trong `worker/docker-compose.yml` |
| Port Web / App | `server.port` trong `client/web/vite.config.ts`, `client/app/ui/vite.config.ts` |
| Địa chỉ Main mà Worker kết nối | `MAIN_HOST` trong `worker/.env` |
| Địa chỉ Main mà Web/App gọi | `proxy` trong `vite.config.ts` |
