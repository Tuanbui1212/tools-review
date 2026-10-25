# Gộp video (sau S11)

> Trạng thái: **DRAFT** — theo D024.

## Ý tưởng

- Pipeline S1–S11 luôn làm **mỗi chapter thành một video riêng**.
- Khi đã có nhiều video chapter đạt chuẩn, người dùng chọn các video đó để **gộp thành một thành phẩm** (ví dụ "Tập 1: chapter 1–10").
- Sửa một chapter thì chỉ render lại chapter đó rồi gộp lại, không phải render lại cả thành phẩm.

## Các bước

1. Chọn các video chapter. Mỗi chapter chọn một bản render đã qua Gate C; mặc định là bản mới nhất.
2. Sắp xếp thứ tự (mặc định theo số chapter).
3. Chọn thêm, nếu muốn:
   - Intro / outro **một lần** cho cả thành phẩm.
   - Bỏ intro/outro riêng của từng chapter.
   - Thẻ tiêu đề giữa các chapter ("Chapter 5").
   - Chuyển cảnh giữa các chapter.
   - Nhạc nền nối liền qua các chapter.
4. Kiểm tra trước khi gộp: các video phải **cùng tỉ lệ khung, độ phân giải, fps**. Nếu khác nhau thì báo lỗi, hoặc cho phép tự chuyển đổi.
5. Gộp bằng ffmpeg trên App. Nếu không thêm hiệu ứng gì thì nối thẳng các file, rất nhanh. Có chuyển cảnh thì chỉ render lại đoạn nối giữa hai chapter.
6. Kiểm tra chất lượng (như S11) → Gate C cho thành phẩm.
7. Tạo **mục lục thời gian** (chapter nào bắt đầu ở phút nào), dùng làm chapter marker khi đăng YouTube.

## Cảnh báo

Khi một chapter đã nằm trong thành phẩm mà có bản render mới, hệ thống đánh dấu thành phẩm đó là **"có bản mới hơn"** và gợi ý gộp lại.

## Dữ liệu

Xem `compilations` trong [../../02-design/database/videos.md](../../02-design/database/videos.md).
