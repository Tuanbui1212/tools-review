# M02 — Vai trò trong project

> Trạng thái: **REVIEW** — theo D013. Chốt khi làm M02.

| Vai trò | Được làm |
|---|---|
| **owner** | Người tạo project. Làm được mọi việc của member, cộng thêm: mời/xoá thành viên, xoá project. |
| **member** | Quyền editor: upload chapter, gắn nhãn nhân vật, sửa OCR, sửa kịch bản, chỉnh timeline, render, **duyệt gate**, cấu hình project. |

- admin và root có toàn quyền trong mọi project họ xem được, không cần được mời (D012).
- Mời theo tên user / email của user có sẵn trong hệ thống. Có thể mời cả root và sub (D011).
- Mọi lần mời / xoá thành viên đều ghi audit log.

Cấp quyền hệ thống: [../M01-backend-foundation/roles.md](../M01-backend-foundation/roles.md).
