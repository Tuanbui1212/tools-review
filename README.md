# Comic Review Tool

Tool tạo video review truyện tranh từ ảnh chapter. Tài liệu: [Docs/](Docs/README.md).

```
tools/
├── Docs/                 # Bàn luận, kế hoạch, đặc tả
├── main/                 # Main service: FastAPI + điều phối (layer)
│   └── docker-compose.yml #   postgres, redis, minio, api
├── worker/               # Worker service, server riêng: FastAPI + Celery (layer)
│   └── docker-compose.yml #   worker-api, celery-worker, celery-beat, flower
├── client/
│   ├── web/              # Web quản lý (React + TS)
│   ├── app/ui/           # Giao diện App (React + TS)
│   ├── app/engine/       # Engine Python chạy trên máy người dùng (M04)
│   └── shared/           # Feature + tiện ích dùng chung Web/App
```

Quy ước cấu trúc code: [Docs/02-design/architecture/code-structure.md](Docs/02-design/architecture/code-structure.md).

## Chạy khi phát triển

Cần: Docker Desktop, Node.js 22+, pnpm.

```bash
# 1. Main server (terminal 1)
cd main && cp .env.example .env
docker compose up --build

# Lần đầu: tạo bảng và tài khoản admin (terminal khác, khi Main đang chạy)
docker compose exec api alembic upgrade head
docker compose exec api python -m app.cli create-admin --username admin --email admin@example.com

# 2. Worker server (terminal 2) — khi phát triển chạy cùng máy, kết nối qua host.docker.internal
cd worker && cp .env.example .env
docker compose up --build

# 3. Web và App (terminal 3)
cd client
pnpm install
pnpm dev:web      # http://localhost:5173
pnpm dev:app      # http://localhost:5174
```

| Địa chỉ | Là gì |
|---|---|
| http://localhost:8000/docs | Swagger UI của Main |
| http://localhost:8000/api/health | Trạng thái PostgreSQL, Redis, MinIO, worker |
| http://localhost:8100/docs | Swagger UI của Worker |
| http://localhost:5555 | Flower — theo dõi job Celery |
| http://localhost:9001 | MinIO Console |

## Đăng nhập thử trên Swagger

1. Mở http://localhost:8000/docs → `POST /api/v1/auth/login` → **Try it out**, nhập `identifier` + `password` của admin.
2. Copy `access_token` trong kết quả.
3. Bấm **Authorize** (góc trên), dán token → gọi được các API cần đăng nhập, ví dụ `GET /api/v1/auth/me`.

## Chạy test (Main hoặc Worker)

```bash
cd main      # hoặc: cd worker
python -m venv .venv && .venv/Scripts/activate
pip install -e ".[dev]"
pytest
```

Test của Main cần PostgreSQL đang chạy (ví dụ `docker compose up -d postgres` trong `main/`). Test tự tạo database riêng `crt_test`; đổi địa chỉ bằng biến `TEST_DATABASE_URL`. Không có PostgreSQL thì các test cần DB được bỏ qua (`skipped`).
