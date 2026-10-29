# Audio, timeline, render, gộp video

> Trạng thái: **DRAFT** — mỗi chapter một video (D024), có lịch sử phiên bản (D025).

## `segment_audio` (S8)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| segment_id | BIGINT | FK → script_segments, NN |
| voice_id | TEXT | NN |
| settings_hash | TEXT | NN; băm của text + giọng + setting; trùng thì dùng lại, không tạo lại |
| file_id | BIGINT | FK → files; rỗng nếu chỉ lưu ở máy (D019: audio tuỳ chọn) |
| duration_ms | INT | NN |
| word_timestamps | JSONB | `[{word, start_ms, end_ms}]` |
| stt_match_score | REAL | điểm so khớp speech-to-text với kịch bản |
| created_at | TIMESTAMPTZ | |

## `timelines` (S9) — timeline của một chapter, có phiên bản

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| script_id | BIGINT | FK → scripts, NN; dựng từ phiên bản kịch bản nào |
| version | INT | NN |
| data | JSONB | NN; track, clip, hiệu ứng, chuyển cảnh |
| settings_snapshot | JSONB | setting video lúc dựng |
| created_by | BIGINT | FK → users |
| created_at | TIMESTAMPTZ | |

UQ: (`chapter_id`, `version`). Lưu JSONB vì App mở và sửa nguyên khối trong trình sửa timeline.

## `renders` (S10, S11) — video của một chapter

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| chapter_id | BIGINT | FK → chapters, NN |
| timeline_id | BIGINT | FK → timelines, NN |
| status | TEXT | `queued` / `running` / `done` / `failed` |
| progress | REAL | 0–100, Web hiển thị |
| output_file_id | BIGINT | FK → files |
| duration_ms | INT | |
| width, height, fps | INT | dùng để kiểm tra khi gộp |
| qc_report | JSONB | kết quả S11 |
| settings_snapshot | JSONB | NN; để tạo lại đúng video |
| rendered_by | BIGINT | FK → users |
| machine_name | TEXT | máy nào render |
| started_at, finished_at | TIMESTAMPTZ | |

## `compilations` — thành phẩm gộp ([../../03-modules/M12-video-merge/pipeline-merge.md](../../03-modules/M12-video-merge/pipeline-merge.md))

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| title | TEXT | NN, ví dụ "Tập 1: chapter 1–10" |
| options | JSONB | intro/outro chung, thẻ tiêu đề, chuyển cảnh giữa chapter |
| status | TEXT | `draft` / `rendering` / `waiting_review` / `done` / `outdated` |
| output_file_id | BIGINT | FK → files |
| chapter_markers | JSONB | `[{chapter_number, start_ms}]` |
| qc_report | JSONB | |
| created_by | BIGINT | FK → users |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

`outdated`: có chapter bên trong vừa có bản render mới hơn.

## `compilation_items`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| compilation_id | BIGINT | PK, FK → compilations |
| seq | INT | PK; thứ tự trong thành phẩm |
| render_id | BIGINT | FK → renders, NN; bản render của chapter được dùng |
