# S10 — Render video

> Trạng thái: **DRAFT**

## Làm gì

- Render từ timeline theo setting: độ phân giải, tỉ lệ khung, fps, bitrate.
- Chạy **trên App, ở máy người dùng** (D009), dùng ffmpeg; có GPU thì dùng mã hoá phần cứng để nhanh hơn.
- Lưu **snapshot cấu hình** đã dùng để tạo lại được đúng video đó.
- Gửi tiến độ (%) lên backend để Web hiển thị.
