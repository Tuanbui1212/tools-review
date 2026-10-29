# Module 11: Xuất bản & Kiểm định Video (Render & Gate C — S10–S11)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN (Khung dự thảo)**  
> **Công đoạn Pipeline:** S10 (Render Video) — S11 (Kiểm định chất lượng QC & Gate C)

---

## 1. Mục tiêu tóm tắt
Render timeline thành video thành phẩm chất lượng cao bằng FFmpeg, tự động kiểm tra chất lượng (QC) phát hiện lỗi đen hình hoặc lệch tiếng, cung cấp trình xem trước và Cổng duyệt Gate C trên Web để xuất bản video chapter.

---

## 2. Phạm vi chính
- **Render FFmpeg**: Xuất video định dạng MP4 (H.264 / H.265), hỗ trợ các tỉ lệ khung hình (16:9 ngang cho YouTube, 9:16 dọc cho TikTok/Shorts).
- **Kiểm định tự động (QC)**: Phát hiện khung hình đen, âm thanh bị rè/mất tiếng, phụ đề tràn màn hình.
- **Cổng duyệt Gate C**: Màn hình Web xem video thành phẩm của chapter, nút phê duyệt Gate C và tải video về máy.

---

## 3. Danh sách việc chính (Khung)
- [ ] Task Worker render video bằng FFmpeg tối ưu tốc độ phần cứng.
- [ ] Logic kiểm tra lỗi tự động (QC rules).
- [ ] Giao diện Web: Player phát video chapter hoàn chỉnh và duyệt Gate C.
