# Theo dõi: worker, task, duyệt, audit, chi phí

> Trạng thái: **DRAFT** — `workers`, `tasks` theo D039, D040 ([../architecture/orchestration.md](../architecture/orchestration.md)).

## `workers` — các worker đang kết nối với Main

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| kind | TEXT | NN; `app` (engine trên máy người dùng) / `server` (Celery worker) |
| user_id | BIGINT | FK → users; chủ máy, với `app`. Rỗng với `server` |
| machine_name | TEXT | NN |
| capabilities | JSONB | GPU, VRAM, các model local đã có, queue Celery phục vụ |
| app_version | TEXT | |
| status | TEXT | `online` / `busy` / `offline` |
| last_heartbeat_at | TIMESTAMPTZ | quá lâu không có heartbeat → `offline` |
| created_at, updated_at | TIMESTAMPTZ | |

## `tasks` — mỗi bước pipeline là một task, Main giao cho worker; Web đọc bảng này để hiện tiến độ

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters; rỗng với task không thuộc chapter (ví dụ gộp video) |
| compilation_id | BIGINT | FK → compilations; với task gộp video |
| stage | TEXT | NN; `S1`…`S11`, `merge` |
| target | TEXT | NN; `app` / `server` — loại worker được nhận |
| queue | TEXT | queue Celery với task `server`: `ai` / `files` / `notify` |
| run_by | BIGINT | FK → users, NN; task `app` chỉ giao cho máy của người này (D040) |
| worker_id | BIGINT | FK → workers; worker đang giữ task |
| depends_on | BIGINT[] | các task phải xong trước |
| status | TEXT | `queued` / `assigned` / `running` / `waiting_review` / `done` / `failed` / `cancelled` |
| priority | INT | NN, mặc định 0 |
| attempt | INT | NN; lần chạy thứ mấy |
| max_attempts | INT | NN; theo setting quy trình |
| lease_expires_at | TIMESTAMPTZ | hết hạn mà không có heartbeat → Main thu hồi, giao lại |
| progress | REAL | 0–100 |
| payload | JSONB | đầu vào của task (setting snapshot, ID dữ liệu cần xử lý) |
| result | JSONB | tóm tắt kết quả |
| error | TEXT | |
| queued_at, started_at, finished_at | TIMESTAMPTZ | |

Index: (`status`, `target`, `run_by`) để Main tìm nhanh task cần giao.

## `gate_reviews`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| gate | TEXT | `A` / `B` / `C` |
| chapter_id | BIGINT | FK → chapters; Gate A, B |
| script_id | BIGINT | FK → scripts; Gate B |
| render_id | BIGINT | FK → renders; Gate C (video chapter) |
| compilation_id | BIGINT | FK → compilations; Gate C (thành phẩm gộp) |
| decision | TEXT | `approved` / `rejected` |
| comment | TEXT | lý do khi từ chối |
| reviewer_id | BIGINT | FK → users, NN |
| created_at | TIMESTAMPTZ | |

## `audit_logs`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| actor_id | BIGINT | FK → users |
| action | TEXT | NN; ví dụ `script.update`, `member.invite` |
| target_type | TEXT | `project` / `chapter` / `script`… |
| target_id | BIGINT | |
| project_id | BIGINT | FK → projects; để lọc nhanh |
| changes | JSONB | giá trị trước / sau |
| client | TEXT | `app` / `web` |
| created_at | TIMESTAMPTZ | NN |

Chỉ thêm, không sửa, không xoá. Root dùng bảng này để xem sub đang làm gì.

## `ai_usage` — chi phí AI trả phí

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK → users, NN |
| project_id | BIGINT | FK → projects |
| chapter_id | BIGINT | FK → chapters |
| stage | TEXT | |
| provider_id | BIGINT | FK → ai_providers |
| model | TEXT | |
| units_in, units_out | BIGINT | token, ký tự hoặc giây audio |
| unit_type | TEXT | `token` / `char` / `second` |
| cost_usd | NUMERIC(12,6) | |
| created_at | TIMESTAMPTZ | NN |

## `usage_limits`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| scope | TEXT | `user` / `project` |
| scope_id | BIGINT | NN |
| monthly_limit_usd | NUMERIC(12,2) | NN |
| set_by | BIGINT | FK → users |
