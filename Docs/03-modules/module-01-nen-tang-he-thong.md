# Module 01: Nền tảng hệ thống, Xác thực & Phân quyền

> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH (CHÍNH THỨC CHỐT XONG)**  
> **Phạm vi:** Backend API (`main/`) + Giao diện Web (`web/`)

---

## 1. Mục tiêu

Xây dựng nền tảng hạ tầng cốt lõi cho toàn bộ hệ thống:
- Cơ chế xác thực tài khoản an toàn qua JWT (Access token 15 phút, Refresh token 7 ngày).
- Mô hình phân quyền hệ thống 3 cấp độ: `admin` (quản trị tối cao) > `root` (quản lý nhóm) > `sub` (thành viên thực thi).
- Quản lý tài khoản người dùng, chống đăng nhập đa phiên trái phép.
- Giao diện Web đăng nhập, quản lý người dùng, đổi mật khẩu và lưu phiên làm việc.

---

## 2. Phạm vi & Chức năng đã thực hiện

### 2.1. Xác thực & Quản lý phiên (Authentication)
- Đăng nhập bằng `username` hoặc `email` kèm mật khẩu.
- Băm mật khẩu an toàn với thuật toán `Argon2`.
- Cấp cặp token JWT: `access_token` (15 phút) và `refresh_token` (7 ngày lưu trong database).
- Làm mới token tự động (`POST /api/v1/auth/refresh`), đăng xuất an toàn (`POST /api/v1/auth/logout`).
- Xem thông tin tài khoản hiện tại (`GET /api/v1/auth/me`), tự đổi mật khẩu (`POST /api/v1/auth/change-password`).
- Quy định phiên: Thiết bị mới đăng nhập cùng loại sẽ thu hồi phiên cũ.

### 2.2. Phân quyền người dùng (Authorization / RBAC)

| Vai trò | Quyền tạo tài khoản | Quyền xem danh sách | Quyền khoá / Đặt lại mật khẩu |
|---|---|---|---|
| **`admin`** | Tạo được `root`, `sub`, `admin` khác | Thấy toàn bộ tài khoản trong hệ thống | Khoá / mở khoá, reset mật khẩu mọi user (trừ chính mình) |
| **`root`** | Tạo được tài khoản `sub` | Thấy toàn bộ `sub` + chính mình | Khoá / mở khoá, reset mật khẩu cho `sub` |
| **`sub`** | Không có quyền tạo | Chỉ thấy thông tin của chính mình | Chỉ đổi mật khẩu của chính mình |

*Nguyên tắc an toàn:*
- Không xoá cứng user, chỉ khoá (`status = inactive`).
- Khoá user sẽ lập tức thu hồi toàn bộ token của user đó.
- Không cho phép tự khoá chính mình hoặc khoá admin cuối cùng còn lại.

### 2.3. Lệnh CLI quản trị
- `python -m app.cli create-admin --username admin --email admin@example.com`: Tạo tài khoản admin khởi tạo.
- `python -m app.cli seed-dev`: Tạo tài khoản mẫu môi trường dev (`admin`, `root1`, `sub1`, `sub2`).

### 2.4. Giao diện Web (`web/`)
- Màn hình Đăng nhập (`/login`) với phong cách Studio làm phim tối, form nhập linh hoạt (username/email).
- Màn hình Quản lý thành viên (`/users`): Bảng danh sách, bộ lọc vai trò/trạng thái, modal tạo user mới, modal khoá/mở khoá và đặt lại mật khẩu.
- Modal đổi mật khẩu cá nhân.
- Xử lý auto-refresh token ngầm dưới `http client`, tự động chuyển hướng về `/login` khi phiên hết hạn.

---

## 3. Cấu trúc CSDL (Database)

- **Bảng `users`**:
  - `id` (BIGINT, tự tăng, Primary Key)
  - `username` (VARCHAR 50, UNIQUE, NOT NULL)
  - `email` (VARCHAR 255, UNIQUE, NOT NULL)
  - `password_hash` (VARCHAR 255, NOT NULL)
  - `system_role` (VARCHAR 20, NOT NULL: `admin` / `root` / `sub`)
  - `status` (VARCHAR 20, NOT NULL: `active` / `inactive`)
  - `created_by_id` (BIGINT, Foreign Key -> `users.id`, nullable)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Bảng `refresh_tokens`**:
  - `id` (BIGINT, tự tăng, Primary Key)
  - `user_id` (BIGINT, Foreign Key -> `users.id`, ON DELETE CASCADE)
  - `token_hash` (VARCHAR 64, UNIQUE, NOT NULL - SHA256 của token)
  - `client_type` (VARCHAR 20, NOT NULL)
  - `expires_at` (TIMESTAMPTZ, NOT NULL)
  - `revoked_at` (TIMESTAMPTZ, nullable)
  - `created_at` (TIMESTAMPTZ)

---

## 4. Danh sách API Endpoints

| Method | Endpoint | Mô tả | Quyền yêu cầu |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Đăng nhập nhận cặp JWT token | Public |
| `POST` | `/api/v1/auth/refresh` | Làm mới access token từ refresh token | Public |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, thu hồi refresh token | Đã đăng nhập |
| `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại | Đã đăng nhập |
| `POST` | `/api/v1/auth/change-password` | Tự đổi mật khẩu của mình | Đã đăng nhập |
| `GET` | `/api/v1/users` | Danh sách tài khoản kèm phân trang, lọc | `admin`, `root` |
| `POST` | `/api/v1/users` | Tạo tài khoản mới | `admin`, `root` |
| `GET` | `/api/v1/users/{id}` | Chi tiết tài khoản | `admin`, `root`, hoặc chính user |
| `PATCH` | `/api/v1/users/{id}` | Cập nhật thông tin user | `admin`, `root` |
| `POST` | `/api/v1/users/{id}/status` | Khoá / Mở khoá tài khoản | `admin`, `root` |
| `POST` | `/api/v1/users/{id}/reset-password` | Quản trị đặt lại mật khẩu cho user | `admin`, `root` |

---

## 5. Danh sách công việc (Tasks) đã hoàn thành

- [x] Khung dự án `main/`: Docker Compose (PostgreSQL, Redis), Alembic, cấu hình layer.
- [x] Migration Alembic tạo bảng `users` và `refresh_tokens`.
- [x] Mô hình bảo mật: băm mật khẩu `Argon2`, sinh & kiểm tra JWT `PyJWT`.
- [x] Tầng Repositories: `UserRepository`, `RefreshTokenRepository`.
- [x] Tầng Services: `AuthService`, `UserService`, `SessionPolicy`.
- [x] Tầng Controllers: `auth_controller.py`, `user_controller.py`, `router.py`.
- [x] CLI commands: `create-admin`, `seed-dev`.
- [x] Test tự động pytest: `test_auth.py`, `test_cli.py`, `test_security.py` (100% Passed).
- [x] Giao diện Web:
  - [x] Khung layout chính, Theme Studio tối cam–hồng.
  - [x] Trang Đăng nhập `/login`.
  - [x] Trang Quản lý tài khoản `/users`.
  - [x] Auto-refresh token và logout handling.
  - [x] Typecheck & build sạch sẽ.

---

## 6. Tiêu chí nghiệm thu (Acceptance)

| # | Tiêu chí nghiệm thu | Kết quả |
|---|---|---|
| A1 | Khởi tạo bảng CSDL và rollback migration Alembic không lỗi | ✅ Đạt |
| A2 | Đăng nhập đúng username/email trả về access token và refresh token | ✅ Đạt |
| A3 | Đăng nhập sai quá số lần hoặc sai thông tin trả về lỗi 401 rõ ràng | ✅ Đạt |
| A4 | Làm mới token thành công khi refresh token còn hạn | ✅ Đạt |
| A5 | Đăng xuất làm vô hiệu hoá refresh token trong database | ✅ Đạt |
| A6 | Admin tạo được Root/Sub/Admin khác; Root chỉ tạo được Sub; Sub không tạo được ai | ✅ Đạt |
| A7 | Không ai có thể tự khoá tài khoản của chính mình | ✅ Đạt |
| A8 | Khoá user làm vô hiệu hoá token ngay lập tức | ✅ Đạt |
| A9 | Giao diện Web chạy mượt mà, phân quyền hiển thị đúng vai trò | ✅ Đạt |
| A10 | Build frontend và backend test tự động pass 100% | ✅ Đạt |
