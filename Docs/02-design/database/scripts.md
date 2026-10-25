# Kịch bản

> Trạng thái: **DRAFT**

## `scripts` — mỗi chapter có nhiều phiên bản kịch bản

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| version | INT | NN; tăng dần mỗi lần tạo lại / sửa lớn |
| style | TEXT | `narration` / `dialogue` / `mixed` (D004) |
| status | TEXT | `draft` / `approved` / `rejected` |
| model | TEXT | model AI đã dùng |
| settings_snapshot | JSONB | setting kịch bản lúc tạo |
| fact_check_report | JSONB | kết quả lượt kiểm tra bịa |
| created_by | BIGINT | FK → users |
| approved_by | BIGINT | FK → users |
| approved_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

UQ: (`chapter_id`, `version`).

## `script_segments`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| script_id | BIGINT | FK → scripts, NN, xoá theo |
| seq | INT | NN; thứ tự |
| type | TEXT | `narration` / `dialogue` |
| speaker_character_id | BIGINT | FK → characters; rỗng = người dẫn |
| text | TEXT | NN |
| emotion | TEXT | |
| pace | TEXT | `slow` / `normal` / `fast` |
| source_text_region_ids | BIGINT[] | câu thoại gốc mà segment dựa vào (để kiểm tra bịa) |

UQ: (`script_id`, `seq`).

## `segment_panels` — câu đọc ↔ panel

Bảng này đảm bảo nguyên tắc "hình đúng lời đọc" ([../../01-requirements/principles.md](../../01-requirements/principles.md)).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| segment_id | BIGINT | PK, FK → script_segments |
| panel_id | BIGINT | PK, FK → panels |
| seq | INT | NN; thứ tự hiện panel trong segment |

- Khoá ngoại đảm bảo panel **có thật**.
- Thêm trigger (hoặc kiểm tra ở backend) để đảm bảo panel **cùng chapter** với kịch bản.
