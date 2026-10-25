# M01 — Nền tảng Main — Đặc tả

> Trạng thái: **APPROVED** (D048) · Lộ trình: [../../00-process/roadmap.md](../../00-process/roadmap.md)

## 1. Mục tiêu

Dựng nền cho Main: **tài khoản, đăng nhập, phân quyền admin / root / sub**, cùng các quy ước API dùng chung. Từ M02 trở đi, mọi API đều dựa trên nền này để biết "ai đang gọi" và "người đó được làm gì".

## 2. Phạm vi

**Đã có từ bước dựng khung:**
- Khung `main/` chia layer, Docker Compose (postgres, redis, minio, api), Alembic, `/api/health`.

**Làm trong M01:**
1. Bảng `users`, `refresh_tokens` và migration đầu tiên.
2. **Đăng nhập** bằng username hoặc email + mật khẩu → trả access token + refresh token (JWT).
3. **Làm mới token** (refresh), **đăng xuất**, **xem thông tin bản thân**, **đổi mật khẩu**.
4. **Quản lý user** theo quyền: tạo, xem danh sách, xem chi tiết, sửa thông tin, khoá / mở khoá, đặt lại mật khẩu.
5. **Tạo admin đầu tiên** bằng lệnh CLI.
6. **Bộ kiểm tra quyền** dùng lại cho các module sau: lấy user hiện tại, yêu cầu quyền hệ thống.
7. **Quy ước API dùng chung**: tiền tố phiên bản, định dạng lỗi, phân trang.
8. Test tự động cho toàn bộ các mục trên.

## 3. Ngoài phạm vi

| Việc | Làm ở |
|---|---|
| Project, thành viên, mời người, audit log | M02 |
| Màn hình đăng nhập, quản lý user trên Web | M03 |
| Đăng nhập từ App | M04 |
| Tự đăng ký tài khoản, quên mật khẩu qua email | Không làm ở phiên bản đầu (đề xuất, xem Q4) |

## 4. Tài liệu liên quan

- Quyền hệ thống: [roles.md](roles.md), [permission-matrix.md](permission-matrix.md)
- Bảng DB: [../../02-design/database/users-auth.md](../../02-design/database/users-auth.md)
- Cấu trúc code: [../../02-design/architecture/code-structure.md](../../02-design/architecture/code-structure.md)

## 5. Thiết kế

### 5.1 Quy tắc quản lý user

| Người thao tác | Tạo được | Thấy được | Khoá / mở khoá, đặt lại mật khẩu, sửa |
|---|---|---|---|
| **admin** | root, sub, admin khác | mọi user | mọi user, trừ chính mình |
| **root** | sub | tất cả sub + chính mình | sub |
| **sub** | — | chính mình | — |

- **Không xoá cứng user**, chỉ khoá. Dữ liệu cũ vẫn cần biết ai đã làm.
- Khoá user thì **thu hồi toàn bộ refresh token** của người đó. Access token còn hạn tự hết sau tối đa 15 phút, và mọi request đều kiểm tra lại `status` của user.
- Không ai tự khoá được chính mình hoặc tự đổi `system_role` của mình.
- Admin cuối cùng đang hoạt động thì không khoá được.

### 5.2 Đăng nhập & token

| Thông số | Đề xuất |
|---|---|
| Băm mật khẩu | argon2 (`argon2-cffi`) |
| JWT | `PyJWT`, thuật toán HS256, khoá bí mật lấy từ biến môi trường `JWT_SECRET` |
| Access token | sống **15 phút**, gửi qua header `Authorization: Bearer …` |
| Refresh token | sống **7 ngày**, DB chỉ lưu bản băm. Mỗi lần refresh thì **đổi token mới, huỷ token cũ** (rotation) |
| Dùng lại refresh token đã huỷ | Nghi bị lộ → thu hồi toàn bộ token của user đó |
| Đăng nhập sai | Sai **5 lần liên tiếp** thì tạm khoá đăng nhập **15 phút** |
| Mật khẩu | Tối thiểu 8 ký tự |
| `client` | Body đăng nhập có `client`: `web` hoặc `app`, lưu vào `refresh_tokens` để biết phiên từ đâu |
| **1 thiết bị** (D049) | Mỗi tài khoản chỉ có **1 phiên**. Đăng nhập ở nơi mới → phiên cũ bị đá ra **ngay** (access token cũ trả 401 `session_replaced`). Cơ chế: `users.session_version` tăng mỗi lần đăng nhập / đổi mật khẩu / bị khoá / đặt lại mật khẩu / logout, access token mang số này. Refresh không tính là đăng nhập mới |

### 5.3 API

Tiền tố: **`/api/v1`**. Riêng `/api/health` giữ nguyên, không đánh phiên bản.

| Method | Đường dẫn | Ai gọi được | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | mọi người | Đăng nhập, trả access + refresh token |
| POST | `/auth/refresh` | có refresh token | Đổi refresh token lấy cặp token mới |
| POST | `/auth/logout` | đã đăng nhập | Huỷ refresh token hiện tại |
| GET | `/auth/me` | đã đăng nhập | Thông tin bản thân |
| POST | `/auth/change-password` | đã đăng nhập | Đổi mật khẩu (cần mật khẩu cũ); huỷ mọi phiên khác |
| GET | `/users` | admin, root | Danh sách user theo quyền xem; lọc theo `system_role`, `status`, tìm theo tên/email; phân trang |
| POST | `/users` | admin, root | Tạo user theo bảng 5.1 |
| GET | `/users/{id}` | admin, root, chính mình | Chi tiết |
| PATCH | `/users/{id}` | theo bảng 5.1; chính mình được sửa `display_name` | Sửa `display_name`, `email` |
| POST | `/users/{id}/lock` | theo bảng 5.1 | Khoá + thu hồi token |
| POST | `/users/{id}/unlock` | theo bảng 5.1 | Mở khoá |
| POST | `/users/{id}/reset-password` | theo bảng 5.1 | Đặt mật khẩu mới cho user; huỷ mọi phiên của user đó |

### 5.4 Quy ước API dùng chung (áp dụng cho mọi module sau)

**Lỗi** luôn trả về cùng một dạng:

```json
{ "error": { "code": "user_locked", "message": "Tài khoản đã bị khoá", "details": {} } }
```

| HTTP | Khi nào |
|---|---|
| 400 | Dữ liệu sai nghiệp vụ |
| 401 | Chưa đăng nhập / token sai hoặc hết hạn |
| 403 | Đã đăng nhập nhưng không đủ quyền |
| 404 | Không tìm thấy, **hoặc không có quyền xem** (không để lộ việc bản ghi có tồn tại) |
| 409 | Trùng (email, username) |
| 422 | Sai định dạng đầu vào |

**Phân trang:** query `?page=1&page_size=20` (tối đa 100), trả về:

```json
{ "items": [], "page": 1, "page_size": 20, "total": 0 }
```

### 5.5 DB

- Tạo migration cho `users`, `refresh_tokens` theo [users-auth.md](../../02-design/database/users-auth.md).
- **Thêm vào `users`**: `failed_login_count INT`, `login_locked_until TIMESTAMPTZ` (để tạm khoá khi đăng nhập sai).
- **Thêm vào `refresh_tokens`**: `replaced_by_id BIGINT` (phục vụ rotation và phát hiện token bị dùng lại), `revoked_reason TEXT` (rotated / logout / new_login / password_changed / password_reset / locked / reuse_detected — để báo đúng lỗi cho thiết bị cũ).
- **Thêm vào `users`**: `session_version INT` (đăng nhập 1 thiết bị, D049).

### 5.6 Code (theo layer)

```
main/app/
├── controllers/   auth_controller.py, user_controller.py
├── services/      auth_service.py, user_service.py, user_policy.py (quy tắc bảng 5.1)
├── repositories/  user_repository.py, refresh_token_repository.py
├── models/        user.py, refresh_token.py
├── schemas/       auth.py, user.py, common.py (lỗi, phân trang)
├── core/          security.py (băm mật khẩu, JWT), errors.py, dependencies.py (current_user, require_roles)
└── cli.py         lệnh create-admin
```

Lệnh tạo admin đầu tiên:

```bash
python -m app.cli create-admin --username admin --email admin@example.com
# hỏi mật khẩu khi chạy, không truyền mật khẩu trên dòng lệnh
```

### 5.7 Setting

| Biến môi trường | Mặc định |
|---|---|
| `JWT_SECRET` | **bắt buộc** khi `ENVIRONMENT=production` |
| `ACCESS_TOKEN_MINUTES` | 15 |
| `REFRESH_TOKEN_DAYS` | 7 |
| `LOGIN_MAX_FAILED` | 5 |
| `LOGIN_LOCK_MINUTES` | 15 |

## 6. Phụ thuộc

Không phụ thuộc module nào. Dựa trên khung `main/` đã dựng.

## 7. Câu hỏi còn mở

> Q1–Q4: đồng ý theo đề xuất (D048).

- [x] **Q1.** Root có thấy và quản lý **root khác** không? Đề xuất: **không**, chỉ admin quản lý root.
- [x] **Q2.** Đăng nhập bằng **cả username lẫn email**, hay chỉ một trong hai? Đề xuất: cả hai.
- [x] **Q3.** Thời gian sống của token: access **15 phút**, refresh **7 ngày** có ổn không? App mở cả ngày thì vẫn tự refresh được.
- [x] **Q4.** Phiên bản đầu **không** có tự đăng ký tài khoản và quên mật khẩu qua email (admin/root đặt lại mật khẩu thay). Đồng ý không?
- [ ] **Q5.** Server trung tâm đặt ở đâu: VPS thuê ngoài, máy chủ công ty, hay máy cá nhân? (không chặn M01)
- [ ] **Q6.** Quy mô: khoảng bao nhiêu user, bao nhiêu chapter mỗi ngày? (không chặn M01)
