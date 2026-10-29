# User & đăng nhập

> Trạng thái: **DRAFT**

## `users`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| email | TEXT | UQ, NN |
| username | TEXT | UQ, NN |
| password_hash | TEXT | NN, băm bằng argon2/bcrypt |
| display_name | TEXT | |
| system_role | TEXT | NN, `admin` / `root` / `sub` |
| status | TEXT | NN, `active` / `locked` |
| created_by | BIGINT | FK → users; ai tạo tài khoản này |
| last_login_at | TIMESTAMPTZ | |
| failed_login_count | INT | NN, mặc định 0; số lần đăng nhập sai liên tiếp |
| login_locked_until | TIMESTAMPTZ | tạm khoá đăng nhập tới lúc này (sai quá nhiều lần) |
| session_version_web, session_version_app | INT | NN, mặc định 0. 1 phiên Web + 1 phiên App (D053); access token mang số này |
| created_at, updated_at | TIMESTAMPTZ | |

- admin tạo được root và sub; root tạo được sub (xem [../../03-modules/M01-backend-foundation/roles.md](../../03-modules/M01-backend-foundation/roles.md)).

## `refresh_tokens`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK → users, NN |
| token_hash | TEXT | NN, chỉ lưu bản băm |
| client | TEXT | `app` / `web` |
| device_name | TEXT | ví dụ tên máy cài App |
| expires_at | TIMESTAMPTZ | NN |
| revoked_at | TIMESTAMPTZ | khoá user → thu hồi hết token |
| replaced_by_id | BIGINT | FK → refresh_tokens; token mới thay thế khi refresh (rotation) |
| revoked_reason | TEXT | rotated / logout / new_login / password_changed / password_reset / locked / reuse_detected |
| created_at | TIMESTAMPTZ | |
