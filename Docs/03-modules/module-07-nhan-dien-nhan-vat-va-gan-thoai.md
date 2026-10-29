# Module 07: Nhận diện Nhân vật & Gắn thoại (Nhân vật — S5–S6)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN**  
> **Công đoạn Pipeline:** S5 (Nhận diện khuôn mặt/nhân vật) — S6 (Gắn kết dữ liệu & Gate A)  
> **Phạm vi:** AI Model / Worker + Giao diện Web duyệt Gate A

---

## 1. Mục tiêu

Nhận diện các khuôn mặt/nhân vật xuất hiện trong các khung tranh, gom nhóm các lần xuất hiện của cùng một nhân vật, liên kết đúng câu thoại với nhân vật đang nói, và cung cấp Cổng duyệt chất lượng Gate A trên Web.

---

## 2. Phạm vi chi tiết

1. **Nhận diện khuôn mặt & Trích xuất đặc trưng (S5)**:
   - Phát hiện vùng khuôn mặt nhân vật anime/manga.
   - Trích xuất vector embedding và sử dụng pgvector trong PostgreSQL để gom cụm (clustering) các khuôn mặt giống nhau.
2. **Gắn kết dữ liệu (Data Linking — S6)**:
   - Thuật toán khoảng cách hình học: Câu thoại nằm gần nhân vật nào thì tự động gán cho nhân vật đó nói (hoặc đánh dấu là lời dẫn truyện / monologue nếu không có nhân vật).
3. **Cổng duyệt Gate A (Giao diện Web)**:
   - Màn hình quản lý danh sách nhân vật của bộ truyện: Đặt tên nhân vật (ví dụ: Nhân vật chính, Nhân vật phản diện, v.v.), gán ảnh đại diện.
   - Bảng rà soát: Xem từng khung tranh $\rightarrow$ Xem nhân vật nói $\rightarrow$ Cho phép đổi người nói nếu AI gán nhầm.
   - Bấm nút **"Duyệt Gate A"** để chốt dữ liệu, chuyển sang khâu sinh kịch bản.

---

## 3. Danh sách công việc (Tasks)

- [ ] Tích hợp mô hình anime face detection và feature extraction.
- [ ] Bảng CSDL `characters`: Danh sách nhân vật của project (tên, avatar, mô tả, giọng đọc mặc định).
- [ ] Bảng CSDL `panel_characters`: Liên kết toạ độ nhân vật trong từng panel.
- [ ] Logic liên kết thoại ↔ nhân vật.
- [ ] Giao diện Web: Quản lý nhân vật & Trình rà soát Gate A.
