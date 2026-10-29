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
- Mỗi module gồm **cả backend lẫn giao diện** cho chức năng của nó (D051). Không làm API xong rồi để giao diện cho module khác.
- Setting của công đoạn nào được làm ngay trong module của công đoạn đó, không làm một lần cho tất cả.
- Module có dùng AI thì **thử model trước** trên chapter mẫu, chọn được model rồi mới code.
- Đang làm một module mà phát hiện cần sửa module đã chốt thì ghi lại, bàn và chốt rồi mới sửa.

## Danh sách module (đề xuất thứ tự)

| # | Module | Nội dung | Trạng thái |
|---|---|---|---|
| **01** | Nền tảng hệ thống | Auth JWT, Quản lý tài khoản, Phân quyền Admin/Root/Sub kèm Web | ✅ đã xong |
| **02** | Quản lý Dự án & Thành viên | Tạo dự án truyện, Phân quyền Owner/Member, Mời thành viên kèm Web | ✅ đã xong |
| **03** | Quản lý Tập truyện & Tải ảnh | Tạo Chapter (S1-S2), Upload nhiều ảnh/ZIP, Sắp xếp thứ tự trang | ✅ đã xong |
| **04** | Hạ tầng Kho lưu trữ & Worker | MinIO/S3 lưu trữ, Celery + Redis hàng đợi nền, WebSocket tiến độ | 📝 đang đặc tả |
| **05** | Tự động Cắt khung tranh | Tách Panel (S3), Thứ tự đọc tranh, Công cụ Web sửa panel | ⏳ |
| **06** | Nhận diện Lời thoại & OCR | Bóc tách bong bóng thoại (S4), OCR chữ đa ngôn ngữ, Từ điển Glossary | ⏳ |
| **07** | Nhận diện Nhân vật & Gắn thoại | Nhận diện nhân vật (S5-S6), Gom cụm mặt, Gán người nói, Gate A | ⏳ |
| **08** | Sinh Kịch bản Review AI | Gọi LLM viết kịch bản (S7), Phân đoạn theo khung tranh, Gate B | ⏳ |
| **09** | Chuyển Giọng đọc TTS | Engine giọng đọc tiếng Việt (S8), Phân vai giọng, Đo timestamp | ⏳ |
| **10** | Dựng Dòng thời gian Video | Timeline (S9), Khớp hình & tiếng, Chuyển động Pan/Zoom, Subtitle, BGM | ⏳ |
| **11** | Xuất bản & Kiểm định Video | Render FFmpeg (S10-S11), Kiểm định lỗi đen/lệch tiếng, Gate C | ⏳ |
| **12** | Gộp các Tập thành Video dài | Nối nhiều chapter thành video tổng hợp, Thêm Intro, Outro, Watermark | ⏳ |
| **13** | Bảng Theo dõi & Thống kê | Bảng tiến độ tổng thể, Báo cáo chi phí API token, Quản lý preset | ⏳ |

Trạng thái: ⏳ chưa bắt đầu · 📝 đang đặc tả · 🔨 đang code · 🧪 nghiệm thu · ✅ đã xong

## Ghi chú về thứ tự

- **M01–M04** là phần nền: không có AI, dễ làm, tài liệu đã gần đủ (phân quyền, DB).
- Có thể **đảo lên trước** một module AI (ví dụ M06 tách panel) nếu muốn kiểm tra sớm chất lượng, vì đây là phần rủi ro nhất. Phần nền làm sau cũng được.
- Thiết kế DB trong [../02-design/database/](../02-design/database/) là bản tổng thể. Mỗi module chỉ tạo migration cho **các bảng mình dùng**.
