# Danh mục các Module hệ thống

> Mỗi module được lưu trữ gọn gàng trong **đúng 1 file Markdown duy nhất** (không dùng folder con), đặt tên hoàn toàn bằng tiếng Việt rõ ràng, dễ tra cứu và theo dõi.

---

## Danh sách Module theo quy trình thực hiện

| # | Tên Module | File tài liệu | Nội dung chính | Trạng thái |
|---|---|---|---|---|
| **01** | Nền tảng hệ thống | [module-01-nen-tang-he-thong.md](module-01-nen-tang-he-thong.md) | Auth JWT, Quản lý tài khoản, Phân quyền Admin/Root/Sub | ✅ **Đã xong** |
| **02** | Quản lý Dự án & Thành viên | [module-02-quan-ly-du-an-thanh-vien.md](module-02-quan-ly-du-an-thanh-vien.md) | Tạo dự án truyện, Phân quyền Owner/Member, Mời thành viên | ✅ **Đã xong** |
| **03** | Quản lý Tập truyện & Tải ảnh | [module-03-quan-ly-tap-truyen-va-tai-anh.md](module-03-quan-ly-tap-truyen-va-tai-anh.md) | Tạo Chapter (S1-S2), Upload nhiều ảnh/ZIP, Sắp xếp thứ tự trang | 📝 **Đang đặc tả** |
| **04** | Hạ tầng Kho lưu trữ & Worker | [module-04-ha-tang-kho-luu-tru-va-worker.md](module-04-ha-tang-kho-luu-tru-va-worker.md) | MinIO/S3 lưu trữ, Celery + Redis hàng đợi nền, WebSocket tiến độ | ⏳ Chờ làm |
| **05** | Tự động Cắt khung tranh | [module-05-tu-dong-cat-khung-tranh.md](module-05-tu-dong-cat-khung-tranh.md) | Tách Panel (S3), Thứ tự đọc tranh, Công cụ Web sửa panel | ⏳ Chờ làm |
| **06** | Nhận diện Lời thoại & OCR | [module-06-nhan-dien-loi-thoai-va-ocr.md](module-06-nhan-dien-loi-thoai-va-ocr.md) | Bóc tách bong bóng thoại (S4), OCR chữ đa ngôn ngữ, Từ điển Glossary | ⏳ Chờ làm |
| **07** | Nhận diện Nhân vật & Gắn thoại | [module-07-nhan-dien-nhan-vat-va-gan-thoai.md](module-07-nhan-dien-nhan-vat-va-gan-thoai.md) | Nhận diện nhân vật (S5-S6), Gom cụm mặt, Gán người nói, **Gate A** | ⏳ Chờ làm |
| **08** | Sinh Kịch bản Review AI | [module-08-sinh-kich-ban-review-ai.md](module-08-sinh-kich-ban-review-ai.md) | Gọi LLM viết kịch bản (S7), Phân đoạn theo khung tranh, **Gate B** | ⏳ Chờ làm |
| **09** | Chuyển Giọng đọc TTS | [module-09-chuyen-giong-doc-tts.md](module-09-chuyen-giong-doc-tts.md) | Engine giọng đọc tiếng Việt (S8), Phân vai giọng, Đo timestamp | ⏳ Chờ làm |
| **10** | Dựng Dòng thời gian Video | [module-10-dung-dong-thoi-gian-video.md](module-10-dung-dong-thoi-gian-video.md) | Timeline (S9), Khớp hình & tiếng, Chuyển động Pan/Zoom, Subtitle, BGM | ⏳ Chờ làm |
| **11** | Xuất bản & Kiểm định Video | [module-11-xuat-ban-va-kiem-dinh-video.md](module-11-xuat-ban-va-kiem-dinh-video.md) | Render FFmpeg (S10-S11), Kiểm định lỗi đen/lệch tiếng, **Gate C** | ⏳ Chờ làm |
| **12** | Gộp các Tập thành Video dài | [module-12-gop-cac-tap-thanh-video-dai.md](module-12-gop-cac-tap-thanh-video-dai.md) | Nối nhiều chapter thành video tổng hợp, Thêm Intro, Outro, Watermark | ⏳ Chờ làm |
| **13** | Bảng Theo dõi & Thống kê | [module-13-bang-theo-doi-va-thong-ke.md](module-13-bang-theo-doi-va-thong-ke.md) | Bảng tiến độ tổng thể, Báo cáo chi phí API token, Quản lý preset | ⏳ Chờ làm |

---

*Ghi chú quy trình:* Làm theo hình thức cuốn chiếu từng module: làm đến đâu thì hoàn thiện chi tiết đặc tả, các điều kiện chặn chẽo, code và nghiệm thu xong mới chuyển sang module tiếp theo.
