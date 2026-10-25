# S8 — Tạo giọng nói (TTS)

> Trạng thái: **DRAFT**

## Làm gì

- Tạo audio cho từng segment: giọng dẫn, hoặc giọng nhân vật theo `speaker`.
- Lấy **timestamp từng từ** để làm phụ đề và căn hình.
- Áp từ điển phát âm cho tên riêng.
- Chuẩn hoá âm lượng, cắt khoảng lặng.

## Kiểm tra chất lượng

Chuyển audio ngược lại thành chữ (speech-to-text), so với kịch bản để phát hiện đọc sai hoặc đọc thiếu. Sai nhiều thì tạo lại segment đó.

## Setting liên quan

[settings.md](settings.md)
