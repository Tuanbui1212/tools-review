# Module 12: Gộp các Tập thành Video dài (Ghép Video)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN (Khung dự thảo)**  
> **Công đoạn Pipeline:** Gộp video chapter thành video tổng hợp hoàn chỉnh

---

## 1. Mục tiêu tóm tắt
Cho phép ghép nối nhiều video chapter đơn lẻ đã hoàn thành thành 1 video tổng hợp dài (ví dụ: "Review trọn bộ Chap 1 đến Chap 15"), tự động chèn clip Intro mở đầu, Outro kết thúc và đóng dấu logo bản quyền.

---

## 2. Phạm vi chính
- **Ghép nối video**: Nối nhiều file MP4 liên tục không bị giật hình, chuyển cảnh mượt.
- **Thành phần phụ**: Chèn video Intro (mở đầu kênh), Outro (kêu gọi like/subscribe), chèn Logo mờ (Watermark) góc màn hình.
- **Giao diện Web**: Chọn các chapter muốn gộp theo thứ tự, kéo thả sắp xếp, bấm gộp và theo dõi tiến độ.

---

## 3. Danh sách việc chính (Khung)
- [ ] Task Worker ghép nối video bằng FFmpeg concat không mất thời gian render lại.
- [ ] Quản lý tài nguyên Intro/Outro/Logo của project.
- [ ] Giao diện Web chọn danh sách chapter và bấm gộp video.
