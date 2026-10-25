# Lộ trình theo module

> Trạng thái: **REVIEW** — thứ tự module cần chủ dự án chốt.

## Cách làm (D027)

Mỗi lần chỉ làm **một module**. Module hiện tại xong và được chốt mới sang module tiếp theo.

```
1. Đặc tả module      Docs/modules/Mxx-<tên>/  (khung đã dựng sẵn, điền khi làm tới)
2. Chủ dự án duyệt    → APPROVED
3. Code               chỉ code đúng phạm vi module
4. Nghiệm thu         chạy thử theo tiêu chí, chủ dự án xác nhận
5. Chốt module        → DONE, sang module tiếp theo
```

- Mỗi module phải **chạy được và dùng thử được** khi xong, không để dở dang.
- Setting của công đoạn nào được làm ngay trong module của công đoạn đó, không làm một lần cho tất cả.
- Module có dùng AI thì **thử model trước** trên chapter mẫu, chọn được model rồi mới code.
- Đang làm một module mà phát hiện cần sửa module đã chốt thì ghi lại, bàn và chốt rồi mới sửa.

## Danh sách module (đề xuất thứ tự)

| # | Module | Nội dung | Trạng thái |
|---|---|---|---|
| M01 | Nền tảng Main | Khung `main/`, Docker Compose, kết nối PostgreSQL, migration, user, đăng nhập, phân quyền admin/root/sub | 🧪 nghiệm thu |
| M02 | Project & thành viên | Tạo project, mời người, owner/member, audit log | ⏳ |
| M03 | Web quản lý (khung) | Giao diện Web: đăng nhập, quản lý user, danh sách project | ⏳ |
| M04 | App + engine (khung) | App web local, engine Python, đăng nhập vào Main | ⏳ |
| M05 | Điều phối task | Main tạo và giao task; App worker: đăng ký, heartbeat, lease, hàng đợi local SQLite; worker service (server riêng): Celery queue `ai` / `files` / `notify`, Flower | ⏳ |
| M06 | Nhập chapter (S1–S2) | Upload ảnh, chuẩn hoá, chống trùng, lưu file lên server | ⏳ |
| M07 | Tách panel (S3) | Thử model → tách panel, thứ tự đọc, công cụ sửa panel | ⏳ |
| M08 | Lời thoại (S4) | Thử model → OCR, glossary, công cụ sửa lời thoại | ⏳ |
| M09 | Nhân vật (S5–S6) | Thử model → nhận diện, gắn nhãn, gắn thoại với nhân vật, Gate A | ⏳ |
| M10 | Kịch bản (S7) | Proxy AI qua backend, ghi chi phí, sinh kịch bản, chống bịa, trình sửa, Gate B | ⏳ |
| M11 | Giọng đọc (S8) | Thử TTS → tạo giọng, timestamp, kiểm tra bằng speech-to-text | ⏳ |
| M12 | Timeline & render (S9–S11) | Dựng timeline, trình sửa, render, QC, Gate C | ⏳ |
| M13 | Gộp video | Gộp video chapter thành thành phẩm | ⏳ |
| M14 | Theo dõi & thống kê | Bảng tiến độ trên Web, root xem sub, chi phí, preset | ⏳ |
| M15 | Đóng gói Electron | File cài `.exe`, tự cập nhật | ⏳ |

Trạng thái: ⏳ chưa bắt đầu · 📝 đang đặc tả · 🔨 đang code · 🧪 nghiệm thu · ✅ đã chốt

## Ghi chú về thứ tự

- **M01–M05** là phần nền: không có AI, dễ làm, tài liệu đã gần đủ (phân quyền, DB).
- Có thể **đảo lên trước** một module AI (ví dụ M07 tách panel) nếu muốn kiểm tra sớm chất lượng, vì đây là phần rủi ro nhất. Phần nền làm sau cũng được.
- Thiết kế DB trong [../02-design/database/](../02-design/database/) là bản tổng thể. Mỗi module chỉ tạo migration cho **các bảng mình dùng**.
