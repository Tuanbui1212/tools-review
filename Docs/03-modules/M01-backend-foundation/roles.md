# M01 — Cấp quyền hệ thống

> Trạng thái: **REVIEW** — theo D007, D011, D012, D021. Chốt khi làm M01.

```
admin  ── thấy và quản lý TẤT CẢ (user, project, cấu hình hệ thống)
  └── root  ── thấy tất cả sub, xem sub đang làm gì, tạo project và mời người
        └── sub  ── project của mình + project được mời vào
```

| Quyền | Vai trò |
|---|---|
| **admin** | Quản trị toàn hệ thống: mọi user, mọi project, cấu hình hệ thống, API key, model AI, preset mặc định, chi phí. Tạo và quản lý root. |
| **root** | Thấy **tất cả** sub và hoạt động của họ (D011). Tạo/khoá sub. Tạo project, mời root khác và sub vào cùng project. Toàn quyền trong các project mình xem được (D012). Không thấy project của root khác nếu chưa được mời (D021). |
| **sub** | Tạo project của mình, làm việc trong project của mình và project được mời vào. |

## Nguyên tắc

- Mọi thao tác chỉnh sửa đều ghi **audit log** (ai, lúc nào, sửa gì). Root dùng log này để xem sub đang làm gì.
- Quyền được kiểm tra ở **backend**. App và Web dùng chung backend (D015) nên chung một hệ thống phân quyền.

Vai trò trong project (owner / member): [../M02-projects-members/project-roles.md](../M02-projects-members/project-roles.md).
