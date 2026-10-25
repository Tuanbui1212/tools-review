# M01 — Nền tảng Main — Tiêu chí nghiệm thu

> Trạng thái: **APPROVED**

Module được coi là **xong** khi tất cả các mục dưới đây đạt.

## Tự động (pytest)

| # | Tiêu chí | Kết quả |
|---|---|---|
| A1 | Migration tạo được bảng `users`, `refresh_tokens` trên DB trống, và rollback được | ✅ |
| A2 | Lệnh `create-admin` tạo được admin; chạy lại với username đã có thì báo lỗi, không tạo trùng | ✅ |
| A3 | Đăng nhập đúng (bằng username và bằng email) trả access + refresh token | ✅ |
| A4 | Đăng nhập sai trả 401; sai 5 lần liên tiếp thì bị tạm khoá, kể cả nhập đúng mật khẩu | ✅ |
| A5 | User bị khoá không đăng nhập được; access token cũ của họ bị từ chối ngay | ✅ |
| A6 | Refresh trả cặp token mới; dùng lại refresh token cũ thì bị từ chối **và** mọi phiên của user bị thu hồi | ✅ |
| A7 | Logout xong thì refresh token đó không dùng được nữa | ✅ |
| A8 | Đổi mật khẩu: sai mật khẩu cũ thì bị từ chối; đổi xong thì các phiên khác bị huỷ | ✅ |
| A9 | Quyền tạo user đúng bảng 5.1: admin tạo root/sub; root chỉ tạo sub; sub không tạo được ai | ✅ |
| A10 | Danh sách user đúng quyền xem: admin thấy tất cả; root thấy sub + chính mình; sub bị 403 | ✅ |
| A11 | Xem/sửa/khoá user ngoài quyền trả **404** (không lộ việc user tồn tại) | ✅ |
| A12 | Không tự khoá được chính mình; không khoá được admin cuối cùng | ✅ |
| A13 | Trùng email/username trả 409; mật khẩu dưới 8 ký tự trả 422 | ✅ |
| A14 | Mọi lỗi trả đúng định dạng `{ "error": { "code", "message", "details" } }` | ✅ |
| A15 | Danh sách trả đúng định dạng phân trang; `page_size` > 100 bị giới hạn | ✅ |
| A16 | DB không lưu mật khẩu dạng thô và không lưu refresh token dạng thô | ✅ |
| A17 | **1 thiết bị** (D049): đăng nhập ở máy B thì máy A bị từ chối ngay (`session_replaced`), cả access lẫn refresh token; refresh ở máy B không làm mất phiên | ✅ |

## Chủ dự án kiểm tra tay

| # | Tiêu chí | Kết quả |
|---|---|---|
| B1 | `docker compose up` trong `main/` chạy được; `/api/health` báo database OK | ✅ database OK (*) |
| B2 | Mở Swagger `/docs`, đăng nhập bằng admin, bấm **Authorize**, gọi được `/auth/me` | ✅ qua API; chủ dự án bấm thử trên Swagger |
| B3 | Dùng admin tạo một root và một sub; đăng nhập bằng root, chỉ thấy sub và chính mình | ✅ |
| B4 | `ruff check` sạch, `pytest` đạt toàn bộ | ✅ 35/35 |

Kết quả: ⬜ chưa kiểm · ✅ đạt · ❌ chưa đạt

(*) Chạy thử ngày 2026-10-25 **không có MinIO** (image MinIO không còn tải được, xem notes). M01 không dùng kho file nên không ảnh hưởng.

## Xác nhận

- Claude chạy test + smoke test: 2026-10-25
- Chủ dự án xác nhận:
- Ngày:
