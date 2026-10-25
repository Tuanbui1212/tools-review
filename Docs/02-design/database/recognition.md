# Kết quả nhận diện

> Trạng thái: **DRAFT**

## `text_regions` — lời thoại / chữ (S4, S6)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| panel_id | BIGINT | FK → panels, NN |
| order_in_panel | INT | NN |
| bbox | JSONB | NN |
| kind | TEXT | `speech` / `thought` / `narration` / `sfx` |
| source_text | TEXT | chữ OCR được (ngôn ngữ gốc) |
| translated_text | TEXT | bản dịch, nếu có |
| ocr_confidence | REAL | 0–1 |
| speaker_character_id | BIGINT | FK → characters; ai nói (S6) |
| speaker_confidence | REAL | 0–1 |
| edited_by | BIGINT | FK → users; ai sửa tay, nếu có |
| created_at, updated_at | TIMESTAMPTZ | |

## `character_appearances` — nhân vật xuất hiện trong panel (S5)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| panel_id | BIGINT | FK → panels, NN |
| bbox | JSONB | NN; khung mặt / người |
| character_id | BIGINT | FK → characters; rỗng nếu chưa nhận ra |
| cluster_label | TEXT | nhóm tạm cho nhân vật chưa biết tên |
| confidence | REAL | 0–1 |
| embedding | VECTOR | |
| confirmed | BOOLEAN | người dùng đã xác nhận |
| created_at, updated_at | TIMESTAMPTZ | |

Gate A dựa vào `ocr_confidence`, `speaker_confidence` và `confidence` so với ngưỡng trong setting.
