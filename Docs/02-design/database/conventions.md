# Quy ước Database

> Trạng thái: **DRAFT**

| Quy ước | Chi tiết |
|---|---|
| Tên bảng, cột | `snake_case`, tên bảng số nhiều (`users`, `chapters`) |
| Khoá chính | `id BIGINT GENERATED ALWAYS AS IDENTITY` — số tự nhiên tự tăng, do PostgreSQL sinh (D032). Khoá ngoại cũng là `BIGINT` |
| Ai sinh ID | Chỉ **server** sinh ID. App muốn tạo bản ghi (chapter, panel, kịch bản…) thì gọi API; dữ liệu App xử lý xong được gửi lên theo lô, server trả về ID |
| Bảo mật ID | ID tăng dần nên đoán được (`/projects/1`, `/projects/2`…). Backend **luôn kiểm tra quyền** trên từng request, không dựa vào việc ID khó đoán |
| Thời gian | `TIMESTAMPTZ`, lưu theo UTC. Mọi bảng chính có `created_at`, `updated_at` |
| Xoá mềm | Project, chapter có `deleted_at`; xoá thì ẩn đi, khôi phục được |
| Giá trị cố định (enum) | Lưu `TEXT` + ràng buộc `CHECK`, dễ thêm giá trị hơn kiểu `ENUM` của Postgres |
| Dữ liệu linh hoạt | `JSONB` cho setting, snapshot cấu hình, timeline |
| Vector | Extension `pgvector` cho embedding nhân vật |
| Toạ độ trên ảnh | `bbox JSONB` dạng `{x, y, w, h}` tính theo pixel ảnh gốc |
| Migration | Alembic; mọi thay đổi schema đi qua migration, không sửa tay |
| Khoá ngoại | Luôn có `FOREIGN KEY`; xoá cha thì xử lý rõ ràng (`CASCADE` hoặc chặn) |

## Ký hiệu trong các file bảng

- **PK** khoá chính, **FK** khoá ngoại, **UQ** duy nhất, **NN** không được rỗng.
