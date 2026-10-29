# Module 05: Tự động Cắt khung tranh (Tách Panel — S3)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN**  
> **Công đoạn Pipeline:** S3 (Tách panel & Xác định thứ tự đọc)  
> **Phạm vi:** AI Model / Worker + Giao diện Web biên tập Panel

---

## 1. Mục tiêu

Tự động phát hiện và cắt từng khung tranh (panel) từ các trang truyện tranh, xác định thứ tự đọc chuẩn xác và cung cấp công cụ trực quan trên Web để người dùng kiểm tra, chỉnh sửa vị trí cắt khi cần.

---

## 2. Phạm vi chi tiết

1. **AI Nhận diện Panel**:
   - Thử nghiệm và tích hợp mô hình phát hiện khung tranh (YOLOv8-manga / OpenCV line detection / Contour detection).
   - Trả về toạ độ bounding box `(x_min, y_min, x_max, y_max)` của từng panel trên trang.
   - Cắt ảnh panel và lưu trữ vào kho file.
2. **Xác định Thứ tự đọc (Reading Order)**:
   - Tự động sắp xếp panel theo hướng đọc cấu hình của dự án:
     - `rtl`: Manga Nhật (Từ phải sang trái, từ trên xuống dưới).
     - `ltr`: Comic phương Tây (Từ trái sang phải, từ trên xuống dưới).
     - `vertical`: Manhwa/Manhua Webtoon (Cuộn dọc từ trên xuống dưới).
3. **Giao diện Web biên tập Panel**:
   - Màn hình Canvas tương tác: Hiển thị trang truyện cùng các khung panel được vẽ đè lên.
   - Cho phép kéo rê chỉnh kích thước khung cắt, xoá khung nhận diện sai, vẽ thêm khung mới.
   - Đổi số thứ tự đọc bằng cách kéo thả hoặc bấm chọn.
   - Nút "Duyệt Panel" để chuyển sang bước tiếp theo.

---

## 3. Danh sách công việc (Tasks)

- [ ] Nghiên cứu và thử nghiệm model tách panel hiệu quả nhất trên các trang truyện mẫu.
- [ ] Xây dựng Celery Task `detect_panels_task` trên Worker.
- [ ] Bảng CSDL `panels`: Lưu toạ độ, số thứ tự đọc, liên kết với `chapter_page_id`.
- [ ] Giao diện Web Canvas biên tập Panel (hỗ trợ zoom, vẽ box, đổi thứ tự).
