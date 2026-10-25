# Cấu trúc code

> Trạng thái: **APPROVED** — theo D044–D047.

## Các service (microservice, D046)

| Service | Folder | Công nghệ | Chạy ở |
|---|---|---|---|
| **Main** | `main/` | FastAPI | Main server, cùng PostgreSQL, Redis, MinIO |
| **Worker** | `worker/` | FastAPI (health) + Celery | **Server riêng**, không chạy trên Main (D045) |
| **Engine** | `client/app/engine/` | Python | Máy người dùng (M04) |
| **Web / App UI** | `client/web/`, `client/app/ui/` | React + TS | Trình duyệt / App |

Mỗi service có `pyproject.toml` / `package.json`, `Dockerfile`, `docker-compose.yml`, test riêng.

### Các service nói chuyện với nhau thế nào

- **Main → Worker**: Main đẩy task vào Redis **theo tên** (ví dụ `system.ping`), không import code của worker. Tên task là hợp đồng giữa hai bên.
- **Worker → Main**: worker **không truy cập DB của Main**. Cần dữ liệu hay báo kết quả thì gọi API của Main. File thì đọc/ghi qua MinIO.
- **Engine → Main**: qua API + WebSocket (M05).

## Backend: kiến trúc layer (D044)

```
request ─► controllers ─► services ─► repositories ─► DB
                             └──────► integrations ─► Redis / MinIO / hàng đợi / API ngoài
```

| Folder | Vai trò | Được gọi tới |
|---|---|---|
| `controllers/` | Nhận HTTP request, kiểm tra đầu vào, gọi service, trả response. **Không chứa nghiệp vụ** | services |
| `services/` | Nghiệp vụ, quyết định transaction (commit) | repositories, integrations |
| `repositories/` | Truy cập DB, một repository cho một model. **Không commit** | models |
| `models/` | Model SQLAlchemy (bảng DB) | — |
| `schemas/` | Pydantic: dữ liệu vào/ra của API | — |
| `integrations/` (Main) · `clients/` (Worker) | Kết nối dịch vụ ngoài: Redis, MinIO, Celery, API của Main, nhà cung cấp AI | — |
| `core/` | Cấu hình, ráp các lớp với nhau (`dependencies.py`), bảo mật | — |
| `db/` | Base model, session | — |
| `tasks/` (Worker) | "Controller" của worker: nhận task từ queue rồi gọi service | services |

Quy tắc: lớp trên chỉ gọi lớp dưới, không gọi ngược, không nhảy cóc (controller không gọi thẳng repository).

## Frontend: kiến trúc feature (D047)

```
client/
├── shared/src/
│   ├── lib/                 # tiện ích chung: http client…
│   └── features/<tên>/      # feature dùng chung cho Web và App
├── web/src/
│   ├── app/                 # providers, router, layout
│   └── features/<tên>/      # feature riêng của Web
└── app/ui/src/
    ├── app/
    └── features/<tên>/      # feature riêng của App
```

Mỗi feature tự chứa những gì nó cần:

```
features/<tên>/
├── api/          # gọi API
├── hooks/        # React Query, logic dùng lại
├── components/   # UI của feature
├── pages/        # trang gắn vào router
├── types.ts
└── index.ts      # API công khai của feature
```

Quy tắc:
- Nơi khác chỉ import qua `index.ts` của feature, không import sâu vào bên trong.
- Feature không import lẫn nhau. Phần cần dùng chung thì đưa vào `shared/`.
- Feature dùng ở cả Web và App thì đặt trong `client/shared/src/features/`.
