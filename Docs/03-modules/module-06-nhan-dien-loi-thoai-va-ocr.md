# Module 06: Nhận diện Lời thoại & OCR (OCR Thoại — S4)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN**  
> **Công đoạn Pipeline:** S4 (Phát hiện bóng thoại & Nhận diện chữ)  
> **Phạm vi:** AI Model / Worker + Giao diện Web biên tập Lời thoại

---

## 1. Mục tiêu

Tự động phát hiện các bong bóng thoại (speech bubble) trong từng panel, nhận diện văn bản (OCR) bằng nhiều ngôn ngữ nguồn và cung cấp bộ từ điển thuật ngữ (Glossary) để chuẩn hoá tên nhân vật/chiêu thức.

---

## 2. Phạm vi chi tiết

1. **Phát hiện Bong bóng thoại (Text Detection)**:
   - AI nhận diện vùng chứa chữ trong từng panel (Bubble detection / DBNet).
   - Tự động tách biệt chữ thoại chính và các âm thanh tượng thanh (SFX).
2. **Nhận diện chữ (OCR)**:
   - Hỗ trợ ngôn ngữ nguồn: Tiếng Nhật (ja - kanji, furigana), Tiếng Hàn (ko), Tiếng Trung (zh), Tiếng Anh (en), Tiếng Việt (vi).
   - Mô hình đề xuất: PaddleOCR / Manga-OCR / Tesseract hoặc API Vision.
3. **Từ điển thuật ngữ (Glossary)**:
   - Quản lý danh sách từ khoá cố định theo bộ truyện (Tên nhân vật, chiêu thức, địa danh) để sửa lỗi OCR tự động.
4. **Giao diện Web biên tập Lời thoại**:
   - Hiển thị danh sách panel kèm các đoạn thoại nhận diện được.
   - Bấm vào đoạn thoại sẽ highlight vùng ảnh tương ứng để người dùng đối chiếu ảnh gốc với chữ nhận diện.
   - Cho phép gõ sửa lại nội dung lời thoại, xoá thoại rác, thêm câu thoại còn thiếu.

---

## 3. Danh sách công việc (Tasks)

- [ ] Thử nghiệm mô hình OCR (Manga-OCR cho tiếng Nhật, PaddleOCR cho Trung/Hàn/Anh).
- [ ] Bảng CSDL `dialogues`: Lưu toạ độ bong bóng thoại, văn bản gốc, văn bản đã hiệu đính, liên kết `panel_id`.
- [ ] Quản lý CSDL `glossary_terms`: Từ điển từ khoá theo project.
- [ ] Giao diện Web: Trình sửa thoại trực quan kèm ảnh đối chiếu.
