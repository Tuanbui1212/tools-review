# Comic Review Tool

Tool tạo video review truyện tranh từ ảnh chapter. Tài liệu thiết kế: [Docs/](Docs/README.md).

Hướng dẫn dưới đây viết cho **Windows + PowerShell**.

---

## 1. Cần cài trước

| Phần mềm | Phiên bản | Dùng để |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | mới nhất | Chạy Main (API, PostgreSQL, Redis) và Worker |
| [Node.js](https://nodejs.org/) | 22 trở lên | Chạy giao diện Web và App |
| [Python](https://www.python.org/) | 3.12 trở lên | Chỉ cần khi chạy test của backend |
| Git | bất kỳ | Lấy code |

Không cần cài pnpm: các lệnh `npm run ...` trong `client/` tự gọi pnpm qua `npx`.

Kiểm tra nhanh:

```powershell
docker --version
node --version
python --version
```

> Docker Desktop phải **đang mở** (biểu tượng cá voi ở khay hệ thống) trước khi chạy các lệnh `docker`.

---

## 2. Các phần của dự án

```
tools/
├── main/      Main: API (FastAPI) + PostgreSQL + Redis      → chạy bằng Docker
├── worker/    Worker: xử lý task chạy nền (Celery)          → chạy bằng Docker, server riêng
├── web/       Web giao diện (React + TypeScript)            → cd web && npm run dev
└── Docs/      Tài liệu
```

| Địa chỉ | Là gì |
|---|---|
| http://localhost:3000 | **Web** giao diện hệ thống |
| http://localhost:8000/docs | Swagger UI của Main (thử API) |
| http://localhost:8000/api/health | Trạng thái hệ thống |
| http://localhost:8100/docs | Swagger UI của Worker |
| http://localhost:5555 | Flower: theo dõi job của Worker |

Danh sách đầy đủ các port: [Docs/02-design/architecture/ports.md](Docs/02-design/architecture/ports.md).

---

## 3. Chạy lần đầu

Làm theo đúng thứ tự. Mở PowerShell tại thư mục `tools`.

### Bước 1 — Main (backend)

```powershell
cd main
Copy-Item .env.example .env

docker compose up -d postgres redis
docker compose up -d --build --no-deps api
```

> Tạm thời **không** chạy `docker compose up` cho cả file: image MinIO (kho file) hiện không tải được. Main vẫn chạy bình thường, chỉ thiếu kho file — sẽ xử lý ở module M05 (D050).

Tạo bảng trong database:

```powershell
docker compose exec api alembic upgrade head
```

Tạo **tài khoản mẫu** để dùng thử (chỉ chạy một lần; chạy lại thì bỏ qua tài khoản đã có):

```powershell
docker compose exec api python -m app.cli seed-dev
```

| Tài khoản | Mật khẩu | Quyền |
|---|---|---|
| `admin` | `password` | admin |
| `root1` | `password` | root |
| `sub1` | `password` | sub |
| `sub2` | `password` | sub |

> ⚠️ Mật khẩu mẫu này **công khai** (repo để public), **chỉ dùng trên máy phát triển**. Lệnh `seed-dev` tự từ chối chạy khi `ENVIRONMENT=production`. Trên server thật, tạo admin bằng lệnh dưới đây với mật khẩu riêng.

Hoặc tự tạo admin với mật khẩu riêng (sẽ hỏi mật khẩu, nhập 2 lần, tối thiểu 8 ký tự):

```powershell
docker compose exec api python -m app.cli create-admin --username admin --email admin@example.com
```

Kiểm tra: mở http://localhost:8000/api/health — thấy `"database": true` là được.

### Bước 2 — Web (giao diện)

Mở **terminal mới**, tại thư mục `tools`:

```powershell
cd web
npm install          # cài thư viện, chỉ cần lần đầu
npm run dev          # Web → http://localhost:3000
```

Mở http://localhost:3000, đăng nhập bằng `admin` / `password` (hoặc tài khoản bạn tự tạo).

### Bước 3 — Worker (chưa bắt buộc)

Hiện chưa có chức năng nào cần Worker. Muốn chạy thử:

```powershell
cd worker
Copy-Item .env.example .env
docker compose up -d --build
```

Khi Worker chạy, `/api/health` của Main sẽ báo `"worker": true`.

---

## 4. Các lần sau (hằng ngày)

| Việc | Lệnh |
|---|---|
| Bật Main | `cd main` → `docker compose up -d postgres redis` → `docker compose up -d --no-deps api` |
| Bật Web | `cd web` → `npm run dev` |
| Tắt Web | Bấm `Ctrl + C` trong terminal đang chạy |
| Tắt Main (giữ dữ liệu) | `cd main` → `docker compose down` |
| Xem log của API | `cd main` → `docker compose logs -f api` |
| Xem các container đang chạy | `docker compose ps` |

### Sau khi kéo code mới (`git pull`)

```powershell
cd main
docker compose up -d --build --no-deps api      # build lại API nếu có thư viện mới
docker compose exec api alembic upgrade head     # cập nhật database nếu có migration mới

cd ..\client
npm run setup                                    # cài thư viện mới nếu có
```

---

## 5. Thử API trên Swagger

1. Mở http://localhost:8000/docs.
2. Chọn `POST /api/v1/auth/login` → **Try it out** → nhập `identifier` (username hoặc email) và `password` → **Execute**.
3. Copy giá trị `access_token` trong kết quả.
4. Bấm **Authorize** (góc trên bên phải), dán token → **Authorize**.
5. Giờ gọi được các API cần đăng nhập, ví dụ `GET /api/v1/auth/me`.

---

## 6. Chạy test

### Backend — Main

Cần PostgreSQL đang chạy (Bước 1). Test tự tạo database riêng `crt_test`, không đụng dữ liệu thật.

```powershell
cd main
python -m venv .venv                                  # lần đầu
.venv\Scripts\python -m pip install -e ".[dev]"       # lần đầu, hoặc khi có thư viện mới
.venv\Scripts\python -m pytest
.venv\Scripts\ruff check .
```

Không có PostgreSQL thì các test cần DB sẽ báo `skipped` thay vì lỗi.

### Backend — Worker

```powershell
cd worker
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m pytest
```

### Giao diện

```powershell
cd client
npm run typecheck    # kiểm tra lỗi TypeScript
npm run build        # build thử Web và App
```

---

## 7. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Port 3000 is already in use` | Đã có Web chạy ở terminal khác | Dùng luôn cái đang chạy, hoặc tắt nó (xem lệnh bên dưới) |
| `pull access denied for minio/minio` | Image MinIO không còn tải được | Chạy Main theo Bước 1 (không chạy cả file compose) |
| `error during connect` / `docker daemon is not running` | Docker Desktop chưa mở | Mở Docker Desktop, đợi chạy xong rồi thử lại |
| Web hiện "Không kết nối được tới Main" | Main chưa chạy | Làm Bước 1, kiểm tra http://localhost:8000/api/health |
| Bị đưa về trang đăng nhập, báo "đăng nhập ở thiết bị khác" | Cùng tài khoản vừa đăng nhập Web ở nơi khác (mỗi tài khoản chỉ 1 phiên Web + 1 phiên App) | Đăng nhập lại |
| `relation "users" does not exist` | Chưa tạo bảng | `docker compose exec api alembic upgrade head` |

Tìm và tắt chương trình đang giữ một port (ví dụ 3000):

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Xoá sạch database để làm lại từ đầu (⚠️ **mất toàn bộ dữ liệu**):

```powershell
cd main
docker compose down -v
```
