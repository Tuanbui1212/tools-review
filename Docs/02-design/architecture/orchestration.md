# Điều phối: Main & Workers

> Trạng thái: **REVIEW** — theo D039, D040, D041.

## Vai trò

**Main** (`main/`) là **bot tổng**. Main chia pipeline của mỗi chapter thành các **task**, giao từng task cho worker phù hợp, rồi theo dõi cho tới khi xong.

| Thành phần | Chạy ở | Làm gì |
|---|---|---|
| **Main** | Server | Tạo task, xếp hàng, giao task, theo dõi, thử lại, dừng chờ duyệt ở gate, đẩy tiến độ lên Web |
| **App worker** | Engine trong App, máy người dùng | Task cần GPU / file local: tách panel, OCR, nhận diện nhân vật, model local, dựng timeline, render, QC |
| **Server worker** | Worker service (`worker/`) — **server riêng**, không chạy trên Main (D045) | Task gọi API trả phí (kịch bản, TTS), xử lý file, thông báo, việc định kỳ |

```
                  ┌──────────────────── MAIN ────────────────────┐
                  │ tạo task · xếp hàng · giao · theo dõi · gate │
                  └───────┬──────────────────────────┬───────────┘
          WebSocket (kéo task)                  Celery + Redis
                  ▼                                  ▼
     App worker (máy của user A)          Server worker (Celery)
     App worker (máy của user B)            queue: ai · files · notify
```

## Quy tắc giao task (D040)

- Task của một lần chạy chỉ giao cho **máy của chính người đã bấm chạy** (`run_by`), hoặc cho **server worker**. Không giao sang máy của người khác.
- Một người có nhiều máy đang bật App: giao cho máy đang rảnh và đủ cấu hình (GPU, VRAM).
- Không có máy nào của người đó đang bật: task **chờ** tới khi người đó mở App.

## Bước nào giao cho worker nào

| Bước | Worker mặc định | Ghi chú |
|---|---|---|
| S1–S2 Nhập chapter | App | Đọc file trên máy, đẩy lên MinIO |
| S3 Tách panel | App | Model local, GPU |
| S4 OCR | App | Nếu dùng AI đọc ảnh trả phí thì phần đó giao cho server worker |
| S5–S6 Nhân vật | App | |
| S7 Kịch bản | Server | Gọi LLM trả phí |
| S8 Giọng đọc | Server | TTS trả phí. Nếu sau này dùng TTS chạy local thì giao cho App |
| S8 Kiểm tra STT | App | Whisper chạy local |
| S9 Timeline | App | |
| S10–S11 Render, QC | App | GPU |
| Gộp video | App | |

Worker của mỗi bước **không cố định trong code** mà suy ra từ adapter AI đang dùng: model local thì giao App, API trả phí thì giao server. Đổi model là đổi luôn worker.

## Vòng đời một task

```
queued ─► assigned ─► running ─► done
              │          │
              │          ├─► failed ─► (tự thử lại, tối đa N lần) ─► queued
              │          └─► waiting_review (gate) ─► người duyệt ─► done / bị từ chối
              └─ hết hạn lease (máy tắt, mất mạng) ─► queued
```

- Khi một task xong, Main tự tạo hoặc mở khoá các task tiếp theo (theo thứ tự phụ thuộc, ví dụ S4 và S5 chạy song song sau S3).
- Task ở gate: Main dừng lại, chờ người duyệt rồi mới chạy tiếp (xem [quality-gates.md](quality-gates.md)).

## App worker kết nối với Main

1. Mở App → đăng nhập → engine **đăng ký worker**: máy nào, GPU gì, VRAM bao nhiêu, phiên bản App.
2. Giữ kết nối **WebSocket** với Main và gửi **heartbeat** định kỳ.
3. Main đẩy task xuống → engine nhận, đưa vào **hàng đợi local (SQLite)** để không mất khi App tắt đột ngột.
4. Engine chạy task, báo tiến độ (%), đẩy kết quả lên Main, file lên MinIO.
5. Mỗi task có **lease** (thời hạn giữ). Quá hạn mà không có heartbeat thì Main thu hồi task và giao lại.

## Server worker

- Main gửi task qua Celery, chia theo queue: `ai` (gọi API trả phí), `files`, `notify`.
- `celery-beat` chạy việc định kỳ: thu hồi task hết lease, mở khoá chapter hết hạn, tổng hợp chi phí.
- Tăng số worker bằng cách chạy thêm container `celery-worker`.
- Flower dùng để theo dõi các job Celery.

## Dữ liệu

Bảng `workers` và `tasks` trong [../database/tracking.md](../database/tracking.md).
