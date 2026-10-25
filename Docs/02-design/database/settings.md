# Cấu hình hệ thống, preset, nhà cung cấp AI

> Trạng thái: **DRAFT**

## `system_settings` — tầng 1, admin quản lý

| Cột | Kiểu | Ghi chú |
|---|---|---|
| key | TEXT | PK, ví dụ `defaults`, `allowed_voices`, `allowed_models` |
| value | JSONB | NN |
| updated_by | BIGINT | FK → users |
| updated_at | TIMESTAMPTZ | |

## `presets` — tầng 2

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| name | TEXT | NN, ví dụ "Manhwa → YouTube 16:9 dẫn truyện" |
| scope | TEXT | `system` (admin tạo, ai cũng dùng) / `personal` (user tự lưu) |
| owner_id | BIGINT | FK → users; rỗng nếu `system` |
| settings | JSONB | NN |
| created_at, updated_at | TIMESTAMPTZ | |

## `ai_providers` — chỉ admin

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| kind | TEXT | `llm` / `tts` / `ocr` / `vision` |
| name | TEXT | tên hiển thị |
| api_key_encrypted | BYTEA | **mã hoá**, không bao giờ gửi xuống App |
| config | JSONB | endpoint, model mặc định, giá… |
| enabled | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |

App gọi AI trả phí qua backend; backend dùng key ở bảng này (xem [../architecture/ai-providers.md](../architecture/ai-providers.md)).
