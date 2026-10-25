# M01 — Nền tảng Main — Danh sách việc

> spec đã **APPROVED** (D048). Code xong; chờ chạy test có DB và nghiệm thu B1–B4.

## Chuẩn bị
- [x] Thêm thư viện: `argon2-cffi`, `PyJWT`
- [x] Thêm setting: `JWT_SECRET`, `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `LOGIN_MAX_FAILED`, `LOGIN_LOCK_MINUTES`; chặn chạy production khi thiếu `JWT_SECRET`
- [x] Cập nhật [users-auth.md](../../02-design/database/users-auth.md) với các cột thêm ở spec 5.5

## Quy ước chung
- [x] `core/errors.py`: lớp lỗi nghiệp vụ + handler trả đúng định dạng lỗi (cả lỗi 422 của FastAPI)
- [x] `schemas/common.py`: model phân trang
- [x] Gắn router nghiệp vụ dưới `/api/v1`

## DB
- [x] `models/user.py`, `models/refresh_token.py`
- [x] Migration đầu tiên: `users`, `refresh_tokens`
- [x] `repositories/user_repository.py`, `repositories/refresh_token_repository.py`

## Bảo mật
- [x] `core/security.py`: băm/kiểm tra mật khẩu, tạo/đọc JWT, băm refresh token
- [x] `core/dependencies.py`: `get_current_user` (kiểm tra token + `status`), `require_roles(...)`

## Nghiệp vụ
- [x] `services/auth_service.py`: login, tạm khoá khi sai, refresh có rotation + phát hiện dùng lại, logout, đổi mật khẩu
- [x] `services/user_policy.py`: quy tắc bảng 5.1 (tạo / xem / quản lý)
- [x] `services/user_service.py`: tạo, danh sách theo quyền, chi tiết, sửa, khoá/mở khoá, đặt lại mật khẩu

## API
- [x] `controllers/auth_controller.py`
- [x] `controllers/user_controller.py`
- [x] Swagger có nút **Authorize** dùng Bearer token

## CLI
- [x] `app/cli.py`: `create-admin` (hỏi mật khẩu khi chạy)

## Test
- [x] Hạ tầng test: DB PostgreSQL riêng cho test, tạo/xoá dữ liệu mỗi test
- [x] Test cho A1–A16 trong [acceptance.md](acceptance.md)

## Kết thúc
- [x] Cập nhật README (cách tạo admin, đăng nhập Swagger)
- [ ] Chủ dự án nghiệm thu B1–B4
