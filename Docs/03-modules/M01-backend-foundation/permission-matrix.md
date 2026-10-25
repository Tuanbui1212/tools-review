# M01 — Bảng phân quyền

> Trạng thái: **REVIEW** — chốt khi làm M01. Các dòng liên quan tới project được dùng tiếp ở M02.

| Hành động | admin | root | sub |
|---|:-:|:-:|:-:|
| Cấu hình hệ thống, API key, model AI, preset mặc định | ✅ | ❌ | ❌ |
| Xem chi phí / thống kê | ✅ toàn hệ thống | ✅ các project mình xem được | ✅ project của mình |
| Tạo / khoá root | ✅ | ❌ | ❌ |
| Tạo / khoá sub | ✅ | ✅ | ❌ |
| Xem danh sách sub và hoạt động của sub | ✅ | ✅ tất cả | ❌ |
| Xem project | ✅ tất cả | ✅ của mình, được mời, và của các sub | ✅ của mình + được mời |
| Tạo project | ✅ | ✅ | ✅ |
| Mời / xoá thành viên project | ✅ | ✅ | ✅ nếu là owner |
| Làm việc trong project (sửa, render, duyệt gate) | ✅ | ✅ | ✅ nếu là owner/member |
| Xoá project | ✅ | ✅ | ✅ nếu là owner |
| Xem audit log | ✅ tất cả | ✅ của các sub và project mình xem được | ✅ project của mình |

- Root **không** thấy project của root khác nếu chưa được mời (D021).
