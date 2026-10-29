# Module 10: Dựng Dòng thời gian Video (Timeline — S9)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN (Khung dự thảo)**  
> **Công đoạn Pipeline:** S9 (Ghép nối hình ảnh ↔ giọng đọc ↔ hiệu ứng chuyển động)

---

## 1. Mục tiêu tóm tắt
Ghép nối chính xác các khung tranh (panel) với các câu thoại giọng đọc (audio timestamp), thêm hiệu ứng chuyển động máy quay (zoom in, pan Ken Burns), tự động tạo phụ đề và chèn nhạc nền (BGM) / âm thanh hiệu ứng (SFX).

---

## 2. Phạm vi chính
- **Khớp hình & tiếng**: Tự động chia thời lượng hiển thị từng panel theo độ dài câu đọc tương ứng.
- **Hiệu ứng chuyển động**: Tạo chuyển động mượt mà cho ảnh tĩnh (zoom, lia máy, rung chấn khi có cảnh hành động).
- **Phụ đề & Âm thanh**: Tự động sinh phụ đề (Subtitle `.srt` / `.ass`), phối trộn nhạc nền (BGM) và hiệu ứng âm thanh (SFX).
- **Giao diện Web**: Trình biên tập timeline đa track trực quan và khung xem trước (preview).

---

## 3. Danh sách việc chính (Khung)
- [ ] Xây dựng cấu trúc dữ liệu timeline (tracks: video, audio, subtitle, sfx).
- [ ] Thuật toán tính toán chuyển động pan/zoom tự động theo vị trí nhân vật.
- [ ] Giao diện Web: Timeline editor dạng multi-track có thể kéo dãn thời lượng.
