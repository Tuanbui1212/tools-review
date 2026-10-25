# Bộ nhớ project: nhân vật, glossary

> Trạng thái: **DRAFT**

## `characters`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| name | TEXT | NN, tên chuẩn dùng trong kịch bản |
| aliases | TEXT[] | tên gọi khác, biệt danh |
| gender | TEXT | dùng để chọn giọng mặc định |
| age_group | TEXT | trẻ em / thiếu niên / người lớn / già |
| description | TEXT | mô tả ngắn, đưa vào prompt kịch bản |
| voice_id | TEXT | giọng gán cho nhân vật (đọc thoại) |
| voice_settings | JSONB | tốc độ, cao độ… |
| first_chapter_id | BIGINT | FK → chapters; xuất hiện lần đầu |
| created_at, updated_at | TIMESTAMPTZ | |

UQ: (`project_id`, `name`).

## `character_embeddings`

Vector mặt mẫu để nhận ra nhân vật ở các chapter sau.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| character_id | BIGINT | FK → characters, NN |
| model | TEXT | NN; tên model tạo embedding (đổi model thì phải tạo lại) |
| embedding | VECTOR | NN; số chiều tuỳ model |
| source_appearance_id | BIGINT | FK → character_appearances; lấy từ panel nào |
| created_at | TIMESTAMPTZ | |

## `glossary_terms`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| term | TEXT | NN; cách viết chuẩn |
| source_term | TEXT | cách viết trong ngôn ngữ gốc |
| kind | TEXT | `name` / `place` / `skill` / `item` / `other` |
| pronunciation | TEXT | cách đọc cho TTS |
| note | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |
