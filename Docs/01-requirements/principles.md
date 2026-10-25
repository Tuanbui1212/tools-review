# Nguyên tắc thiết kế

> Trạng thái: **DRAFT**

## 1. Panel là đơn vị hình ảnh, kịch bản trỏ tới panel

Video không dùng cả trang làm đơn vị hình ảnh mà dùng **panel** (khung tranh). Mỗi câu trong kịch bản phải ghi rõ nó minh hoạ bằng panel nào. Nhờ vậy "hình đúng lời đọc, đúng chapter" được đảm bảo ngay từ bước viết kịch bản, và bước dựng video chỉ cần làm theo.

## 2. Tự động + cổng duyệt

AI vẫn có lúc sai, nhất là khi nhận diện nhân vật và đọc chữ cách điệu. Hệ thống tự chạy toàn bộ và tự chấm điểm độ tin cậy, **chỉ dừng cho người duyệt khi điểm thấp** hoặc ở các gate được bật. Xem [../02-design/architecture/quality-gates.md](../02-design/architecture/quality-gates.md).

## 3. Mỗi project có bộ nhớ riêng

Gồm nhân vật, glossary tên riêng, tóm tắt các chapter trước. Nhân vật chỉ cần gắn tên một lần, các chapter sau tool tự nhận ra. Kịch bản các chapter sau nhờ đó mà nhất quán với cốt truyện.

## 4. Giọng nói dẫn nhịp, hình ảnh chạy theo

Thời lượng của từng đoạn video bằng thời lượng audio của đoạn đó. Hình ảnh và chuyển cảnh được căn theo giọng đọc, không làm ngược lại.

## 5. Mỗi bước chạy lại được

Mỗi công đoạn là một job độc lập và lưu kết quả riêng. Sửa kịch bản thì chỉ chạy lại từ bước tạo giọng, không phải OCR lại.
