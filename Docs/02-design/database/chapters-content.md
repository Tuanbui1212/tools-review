# Chapter, trang, panel, file

> Trạng thái: **DRAFT**

## `chapters`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| number | INT | NN; số nguyên (D023) |
| title | TEXT | |
| status | TEXT | `new` / `processing` / `waiting_review` / `done` / `failed` |
| current_stage | TEXT | `S1`…`S11` |
| summary | TEXT | tóm tắt sau S7, dùng cho các chapter sau |
| settings_override | JSONB | tầng 4 |
| locked_by | BIGINT | FK → users; ai đang sửa (D019) |
| lock_expires_at | TIMESTAMPTZ | hết hạn thì tự mở khoá |
| created_by | BIGINT | FK → users |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

UQ: (`project_id`, `number`) với chapter chưa xoá.

## `files`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| kind | TEXT | `page_image` / `audio` / `video` / `thumbnail` / `asset` |
| storage_key | TEXT | NN; đường dẫn trong kho file trên server |
| mime_type | TEXT | |
| size_bytes | BIGINT | |
| sha256 | TEXT | kiểm tra file nguyên vẹn khi tải lên/xuống |
| uploaded_by | BIGINT | FK → users |
| created_at | TIMESTAMPTZ | |

## `pages`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| page_index | INT | NN; thứ tự trang |
| file_id | BIGINT | FK → files, NN |
| width, height | INT | |
| phash | BIGINT | perceptual hash, dùng chống trùng ở S2 |
| is_junk | BOOLEAN | trang quảng cáo / credit |
| junk_reason | TEXT | |

UQ: (`chapter_id`, `page_index`). Có index trên `phash`.

## `panels`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| page_id | BIGINT | FK → pages, NN |
| reading_order | INT | NN; thứ tự đọc trong chapter |
| bbox | JSONB | NN; `{x, y, w, h}` trên ảnh gốc |
| source | TEXT | `auto` / `manual` |
| confidence | REAL | 0–1 |

UQ: (`chapter_id`, `reading_order`). Ảnh panel không lưu, cắt lại từ ảnh gốc theo `bbox` (D019).
