# Module 08: Sinh Kịch bản Review bằng AI (Kịch bản — S7)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN**  
> **Công đoạn Pipeline:** S7 (Sinh kịch bản review & Gate B)  
> **Phạm vi:** AI Integration (LLM) + Giao diện Web biên tập kịch bản

---

## 1. Mục tiêu

Ứng dụng các mô hình ngôn ngữ lớn (LLM: Gemini, GPT, Claude) để tự động tạo ra một kịch bản review truyện tranh hấp dẫn, trung thực với cốt truyện, được phân đoạn khớp từng giây với các khung tranh, kèm công cụ biên tập và Cổng duyệt Gate B.

---

## 2. Phạm vi chi tiết

1. **Proxy AI & Quản lý API Key trên Server (D010, D040)**:
   - Toàn bộ API key (Gemini / OpenAI / Anthropic) được lưu trữ an toàn trên server backend, không lộ xuống client.
   - Ghi nhận chi phí token và thời gian phản hồi cho từng lần gọi.
2. **Sinh kịch bản (Prompting & Script Generation)**:
   - Đầu vào: Danh sách panel, mô tả bối cảnh, nhân vật và toàn bộ lời thoại đã được duyệt ở Gate A.
   - Hỗ trợ các phong cách review:
     - Dẫn truyện (Narrator): Người kể chuyện tóm tắt lôi cuốn.
     - Kịch truyền thanh: Phân vai các nhân vật đối thoại trực tiếp.
     - Kết hợp: Dẫn chuyện + giữ nguyên các câu thoại điểm nhấn của nhân vật.
   - Cơ chế chống "bịa truyện" (Anti-hallucination): Ép LLM bám sát các sự kiện thực tế trong từng panel.
3. **Phân đoạn kịch bản (Script Segments)**:
   - Mỗi câu đọc trong kịch bản được gắn chặt với 1 hoặc nhiều panel cụ thể để video chuyển cảnh mượt mà.
4. **Cổng duyệt Gate B (Giao diện Web)**:
   - Trình biên tập kịch bản dạng kịch bản phân cảnh: Cột trái hiện panel, cột phải hiện văn bản lời đọc tương ứng.
   - Cho phép biên tập viên gõ sửa trực tiếp từng câu chữ, thêm bớt câu dẫn.
   - Lịch sử phiên bản kịch bản (D025): Cho phép hoàn tác (undo/redo) hoặc quay về phiên bản cũ.
   - Nút **"Duyệt Gate B"** để chốt kịch bản và chuyển sang khâu tạo giọng đọc.

---

## 3. Danh sách công việc (Tasks)

- [ ] Adapter tích hợp LLM (Gemini API, OpenAI API).
- [ ] Bảng CSDL `scripts` và `script_segments`: Lưu nội dung câu đọc, panel mapping, phiên bản kịch bản.
- [ ] Prompt template chuẩn hoá review truyện tranh.
- [ ] Giao diện Web: Trình biên tập kịch bản phân cảnh & Gate B.
