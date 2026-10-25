# Engine xử lý trong App

> Trạng thái: **DRAFT** — theo D009.

## Là gì

Một chương trình **Python** đóng gói kèm App, chạy các bước S1–S11 trên máy người dùng. Giao diện App điều khiển engine qua kết nối nội bộ trên máy (localhost).

## Việc của engine

- Chạy từng bước pipeline, mỗi bước lưu kết quả vào thư mục làm việc local.
- Gọi model AI chạy local (tách panel, OCR, nhận diện nhân vật, render).
- Gọi API AI trả phí **qua backend** (kịch bản, TTS…).
- Báo tiến độ lên backend.
- Đẩy kết quả cần dùng chung lên backend ([data-sync.md](data-sync.md)).
- Chạy lại được từ bất kỳ bước nào.

## Hàng đợi & file local

- Engine là **App worker** (D039): đăng ký với Main, giữ WebSocket + heartbeat, **nhận task do Main giao** ([orchestration.md](orchestration.md)).
- Task nhận về được lưu trong **hàng đợi local bằng SQLite** để không mất khi App tắt đột ngột. Không dùng Celery vì Celery không hỗ trợ Windows chính thức và sẽ bắt mỗi máy cài thêm Redis (D036).
- File làm việc nằm trong **thư mục làm việc** chia theo project/chapter. SQLite ghi file nào đã tải về, đã đẩy lên server chưa, có xoá cache được không. Có giới hạn dung lượng, tự dọn file cũ (D038).
- File dùng chung thật sự nằm trên MinIO ở server; thư mục local chỉ là bản làm việc.

## Đóng gói

- Đóng gói bằng PyInstaller (hoặc Python embedded), người dùng không phải tự cài Python.
- Model AI tải về lần đầu khi cần, không nhét vào file cài đặt cho đỡ nặng.
- Kèm ffmpeg.

## Yêu cầu máy

Máy người dùng có GPU NVIDIA (D020): model local chạy bằng GPU. Cấu hình tối thiểu (VRAM) sẽ chốt sau khi thử model ở `08-ai-evaluation/`.
