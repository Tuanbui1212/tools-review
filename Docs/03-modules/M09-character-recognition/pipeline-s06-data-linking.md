# S6 — Gắn kết dữ liệu → DB

> Trạng thái: **DRAFT**

## Làm gì

Gắn mỗi câu thoại với:
- panel chứa nó,
- nhân vật nói, dựa vào đuôi bóng thoại và nhân vật ở gần nhất,
- thứ tự trong chapter.

Kết quả là **bản chép lời có cấu trúc** của chapter, lưu DB, làm đầu vào cho S7.

## Gate A

Dừng cho người duyệt nếu điểm tin cậy OCR hoặc nhân vật thấp hơn ngưỡng (hoặc khi Gate A được bật). Xem [../../02-design/architecture/quality-gates.md](../../02-design/architecture/quality-gates.md).
