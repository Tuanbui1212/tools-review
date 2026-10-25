# Triển khai

> Trạng thái: **DRAFT**

| Phần | Cách triển khai |
|---|---|
| Main server | `main/docker-compose.yml`: `postgres`, `redis`, `minio`, `api`. Không cần GPU |
| Worker server | `worker/docker-compose.yml` trên **máy riêng** (D045): `worker-api`, `celery-worker` (tăng số bản khi cần), `celery-beat`, `flower`. Kết nối tới Redis, API, MinIO của Main |
| Web | Build tĩnh, phục vụ qua nginx trên cùng server |
| App | File cài đặt Windows (`.exe`); có cơ chế tự cập nhật |

## Còn mở

- Server đặt ở đâu (VPS, máy chủ công ty…)? — Q22.
