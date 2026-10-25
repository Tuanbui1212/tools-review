# Project, thành viên, lời mời

> Trạng thái: **DRAFT**

## `projects`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| name | TEXT | NN |
| description | TEXT | |
| owner_id | BIGINT | FK → users, NN |
| comic_type | TEXT | manga / manhwa / manhua / webtoon / comic / vn |
| reading_direction | TEXT | `rtl` / `ltr` / `ttb` |
| source_lang, target_lang | TEXT | mã ngôn ngữ: `vi`, `en`, `ja`… |
| genre | TEXT[] | nhiều thể loại |
| preset_id | BIGINT | FK → presets; preset gốc lúc tạo |
| settings | JSONB | phần ghi đè của project (tầng 3, xem [../../03-modules/M02-projects-members/settings-layers.md](../../03-modules/M02-projects-members/settings-layers.md)) |
| automation_level | TEXT | `full_auto` / `review_script` / `review_all` |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

## `project_members`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | BIGINT | PK, FK → projects |
| user_id | BIGINT | PK, FK → users |
| role | TEXT | `owner` / `member` |
| invited_by | BIGINT | FK → users |
| joined_at | TIMESTAMPTZ | |

Quyền xem project được tính như sau:
- admin: mọi project.
- root: project mình là thành viên, cộng với project có owner là sub (D011, D021).
- sub: project mình là thành viên.

## `project_invitations`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK → projects, NN |
| invitee_user_id | BIGINT | FK → users, NN |
| invited_by | BIGINT | FK → users, NN |
| status | TEXT | `pending` / `accepted` / `declined` / `revoked` |
| expires_at | TIMESTAMPTZ | |
| created_at, responded_at | TIMESTAMPTZ | |

Chỉ mời được user đã có trong hệ thống (D011). Nếu cần mời người chưa có tài khoản qua email, thêm cột `invitee_email` sau.
