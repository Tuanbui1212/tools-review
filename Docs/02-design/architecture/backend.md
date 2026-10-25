# Main (backend)

> Trạng thái: **DRAFT** — ngôn ngữ và DB đã chốt (D016).

## Công nghệ (đề xuất)

| Phần | Công nghệ | Lý do |
|---|---|---|
| Ngôn ngữ | Python | D016 |
| Web framework | FastAPI | Nhanh, tự sinh tài liệu API, hỗ trợ WebSocket để đẩy tiến độ |
| Database | PostgreSQL | D016 |
| ORM + migration | SQLAlchemy + Alembic | Phổ biến nhất trong Python |
| Xác thực | JWT (access + refresh token) | Dùng chung cho App và Web |
| Lưu file | MinIO (D038) | Xem [data-sync.md](data-sync.md) |
| Việc chạy nền | Main **chỉ đẩy task** vào Redis; worker service riêng xử lý (D045) | |
| Tài liệu API | Swagger UI có sẵn (`/docs`) (D037) | |

## Main (backend) làm gì

- Đăng nhập, phân quyền ([../../03-modules/M01-backend-foundation/roles.md](../../03-modules/M01-backend-foundation/roles.md)).
- Quản lý project, chapter, thành viên, lời mời.
- Lưu dữ liệu pipeline: panel, lời thoại, nhân vật, kịch bản, timeline.
- Nhận tiến độ từ App, đẩy cho Web theo thời gian thực.
- Proxy gọi API AI trả phí, ghi chi phí.
- Audit log.

## Main (backend) KHÔNG làm

- Không chạy AI local hay render (D009).
- **Không chạy worker** (D045): việc chạy nền do worker service (`worker/`) trên server riêng xử lý.

Cấu trúc code theo layer: [code-structure.md](code-structure.md).

## Thiết kế DB chi tiết

Xem [../database/](../database/).
