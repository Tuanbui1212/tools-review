# Kiến trúc tổng thể

> Trạng thái: **DRAFT**

```
 MÁY NGƯỜI DÙNG (Windows)                 MAIN — server (Docker Compose)
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│ App = App worker             │        │ api (FastAPI) + điều phối task   │
│  ├─ Giao diện chỉnh sửa      │  HTTPS │  ├─ Đăng nhập, phân quyền        │
│  └─ Engine (Python)          │◄──────►│  ├─ Project, chapter, dữ liệu    │
│      S1–S11: AI, render      │        │  ├─ Tiến độ (WebSocket), audit   │
│      dùng GPU của máy        │        │  └─ Swagger: /docs               │
│      hàng đợi nhẹ (SQLite)   │        │                                  │
│  Thư mục làm việc local      │        │                                  │
│  + SQLite trạng thái file    │        │                                  │
└──────────────────────────────┘        │                                  │
                                        │ redis    — hàng đợi, tiến độ     │
 TRÌNH DUYỆT                            │ postgres — database              │
┌──────────────────────────────┐        │ minio    — file dùng chung       │
│ Web: quản lý, xem tiến độ    │◄──────►│                                  │
└──────────────────────────────┘        └────────────────┬─────────────────┘
                                                         │ Redis (task) · API · MinIO
                                        ┌────────────────▼─────────────────┐
                                        │ WORKER — server riêng (D045)     │
                                        │ celery-worker (nhiều bản)        │
                                        │  └─ gọi AI trả phí, xử lý file,  │
                                        │     thông báo                    │
                                        │ celery-beat — việc định kỳ       │
                                        │ flower — theo dõi job            │
                                        │ worker-api — health              │
                                        └──────────────────────────────────┘
```

## Điểm chính

- **Main là bot tổng** (D039): chia pipeline thành task, giao cho App worker (máy người dùng) và server worker (Celery). Xem [orchestration.md](orchestration.md).
- **Phần nặng chạy trên App** (D009): AI, tạo giọng, render đều dùng tài nguyên máy người dùng. Server nhẹ và rẻ.
- **App và Web dùng chung backend** (D015): chung tài khoản, phân quyền, dữ liệu.
- **Web chỉ quản lý và xem**: tiến độ, user, project, duyệt nhanh, tải video.
- **Đề xuất: API key trả phí nằm trên server.** App gọi API AI trả phí qua backend để key không bị lộ trên máy người dùng và để ghi lại chi phí. Xem [ai-providers.md](ai-providers.md).

## Cấu trúc thư mục code (dự kiến)

```
tools/
├── Docs/
├── main/              # Main: API + điều phối + migration DB
├── worker/            # Worker service: Celery worker + beat + flower (server riêng)
└── client/
    ├── app/
    │   ├── ui/        # Giao diện App
    │   └── engine/    # Pipeline Python chạy local
    ├── web/           # Giao diện Web
    └── shared/        # Code giao diện dùng chung App + Web
```
