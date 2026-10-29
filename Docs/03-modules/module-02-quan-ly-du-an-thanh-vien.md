# Module 02: Quản lý Dự án & Thành viên

> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH (CHÍNH THỨC CHỐT XONG)**  
> **Phạm vi:** Backend API (`main/`) + Giao diện Web (`web/`)

---

## 1. Mục tiêu

Quản lý các bộ truyện (Project) trong hệ thống, phân quyền vai trò nội bộ trong từng project (`owner` / `member`), quản lý lời mời tham gia, lưu trữ cấu hình tầng của bộ truyện và hỗ trợ xoá mềm an toàn.

---

## 2. Phạm vi & Chức năng đã thực hiện

### 2.1. Quản lý Dự án (Project)
- Tạo mới dự án truyện tranh với các thông tin: Tên truyện, mô tả, loại truyện (`comic_type`), hướng đọc (`reading_direction`), ngôn ngữ gốc/đích, thể loại (`genre`), mức độ tự động duyệt cổng (`automation_level`).
- Xem chi tiết cấu hình và thống kê dự án.
- Cập nhật thông tin dự án (chỉ Owner hoặc Member có quyền chỉnh sửa).
- Xoá mềm dự án (`deleted_at`): Dự án bị ẩn khỏi danh sách mặc định nhưng dữ liệu vẫn được bảo toàn và có thể khôi phục.

### 2.2. Quản lý Thành viên & Lời mời
- Người tạo project tự động được gán vai trò **`owner`** (chủ sở hữu).
- Thành viên tham gia project có vai trò **`member`** (editor), có đầy đủ quyền cấu hình nội dung và duyệt các bước pipeline.
- Gửi lời mời tham gia project tới user khác qua username hoặc email.
- Người nhận có thể Chấp nhận (`accepted`) $\rightarrow$ trở thành member, hoặc Từ chối (`declined`).
- Owner có quyền thu hồi lời mời (`revoked`) hoặc xoá member khỏi project. Không thể xoá owner duy nhất.

### 2.3. Ma trận Quyền xem dự án

| Người xem | Dự án được phép nhìn thấy |
|---|---|
| **`admin`** | Thấy toàn bộ dự án trong hệ thống |
| **`root`** | Thấy các dự án mình tham gia + các dự án do `sub` của mình tạo |
| **`sub`** | Chỉ thấy các dự án mình là thành viên (`owner` hoặc `member`) |

*Nguyên tắc ẩn:* Nếu user không có quyền truy cập vào một project cụ thể, API trả về `404 Not Found` (không trả về 403 để tránh lộ sự tồn tại của project).

### 2.4. Giao diện Web (`web/`)
- Menu thanh bên hiển thị mục "Dự án" (`/projects`).
- **Trang danh sách `/projects`**:
  - 3 thẻ thống kê tổng quan (Tổng số dự án, Dự án đang hoạt động, Đã lưu trữ) trả về trong cùng 1 request API.
  - Thanh tìm kiếm tên dự án có debounce (350ms).
  - Bộ lọc theo loại truyện (Manga, Manhwa, Manhua, Comic...).
  - Nút bấm "Tạo dự án" $\rightarrow$ mở Modal nhập liệu với gợi ý tự động hướng đọc theo loại truyện.
- **Trang chi tiết `/projects/:id`**:
  - Tab "Cấu hình": Xem và chỉnh sửa thông số truyện, hướng đọc, automation level.
  - Tab "Thành viên": Xem danh sách thành viên hiện tại, vai trò (Owner/Member), modal gửi lời mời và danh sách lời mời đang chờ.

---

## 3. Cấu trúc CSDL (Database)

- **Bảng `projects`**:
  - `id` (BIGINT, tự tăng, Primary Key)
  - `name` (VARCHAR 255, NOT NULL)
  - `description` (TEXT, nullable)
  - `comic_type` (VARCHAR 50, NOT NULL: `manga`, `manhwa`, `manhua`, `comic`, `webtoon`)
  - `reading_direction` (VARCHAR 20, NOT NULL: `rtl`, `ltr`, `vertical`)
  - `source_language` (VARCHAR 10, NOT NULL: `ja`, `ko`, `zh`, `en`)
  - `target_language` (VARCHAR 10, NOT NULL: `vi`)
  - `genre` (VARCHAR 100, nullable)
  - `automation_level` (VARCHAR 30, NOT NULL: `full_auto`, `review_script`, `review_all`)
  - `settings` (JSONB, NOT NULL, DEFAULT `{}`)
  - `created_by_id` (BIGINT, Foreign Key -> `users.id`)
  - `deleted_at` (TIMESTAMPTZ, nullable - dùng cho xoá mềm)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Bảng `project_members`**:
  - `id` (BIGINT, tự tăng, Primary Key)
  - `project_id` (BIGINT, Foreign Key -> `projects.id`, ON DELETE CASCADE)
  - `user_id` (BIGINT, Foreign Key -> `users.id`, ON DELETE CASCADE)
  - `role` (VARCHAR 20, NOT NULL: `owner` / `member`)
  - `joined_at` (TIMESTAMPTZ)
  - UNIQUE(`project_id`, `user_id`)
- **Bảng `project_invitations`**:
  - `id` (BIGINT, tự tăng, Primary Key)
  - `project_id` (BIGINT, Foreign Key -> `projects.id`, ON DELETE CASCADE)
  - `inviter_id` (BIGINT, Foreign Key -> `users.id`)
  - `invitee_id` (BIGINT, Foreign Key -> `users.id`)
  - `status` (VARCHAR 20, NOT NULL: `pending`, `accepted`, `declined`, `revoked`)
  - `created_at`, `responded_at` (TIMESTAMPTZ)

---

## 4. Danh sách API Endpoints

| Method | Endpoint | Mô tả | Quyền yêu cầu |
|---|---|---|---|
| `GET` | `/api/v1/projects` | Danh sách project kèm thống kê, phân trang, lọc, tìm kiếm | Đã đăng nhập |
| `POST` | `/api/v1/projects` | Tạo project mới (người tạo tự thành owner) | Đã đăng nhập |
| `GET` | `/api/v1/projects/{id}` | Chi tiết cấu hình project | Thành viên hoặc Admin/Root quản lý |
| `PATCH` | `/api/v1/projects/{id}` | Cập nhật cấu hình project | Owner hoặc Member |
| `DELETE` | `/api/v1/projects/{id}` | Xoá mềm project | Owner hoặc Admin/Root quản lý |
| `GET` | `/api/v1/projects/{id}/members` | Danh sách thành viên trong project | Thành viên project |
| `POST` | `/api/v1/projects/{id}/invitations` | Mời thành viên mới tham gia | Owner hoặc Admin |
| `DELETE` | `/api/v1/projects/{id}/members/{user_id}` | Xoá thành viên khỏi project | Owner hoặc Admin |
| `GET` | `/api/v1/invitations/me` | Xem danh sách lời mời gửi tới bản thân | Đã đăng nhập |
| `POST` | `/api/v1/invitations/{id}/respond` | Chấp nhận hoặc từ chối lời mời | Người được mời |

---

## 5. Danh sách công việc (Tasks) đã hoàn thành

- [x] Migration Alembic: tạo các bảng `projects`, `project_members`, `project_invitations`.
- [x] Models SQLAlchemy: `Project`, `ProjectMember`, `ProjectInvitation`.
- [x] Schemas Pydantic: `ProjectCreate`, `ProjectUpdate`, `ProjectRead`, `ProjectMemberRead`, `ProjectInvitationCreate`, `ProjectInvitationRead`.
- [x] Repositories: `ProjectRepository`, `ProjectMemberRepository`, `ProjectInvitationRepository`.
- [x] Nghiệp vụ & Quyền: `ProjectPolicy` (kiểm tra chặt chẽ theo D011, D012, D013, D021), `ProjectService`.
- [x] Controllers: `project_controller.py`, `invitation_controller.py`, gắn vào `router.py`.
- [x] Test tự động pytest: `test_projects.py` (pass 100% tất cả các kịch bản quyền và luồng nghiệp vụ).
- [x] Giao diện Web:
  - [x] Trang danh sách `/projects` kèm thẻ thống kê, tìm kiếm debounced, bộ lọc.
  - [x] Modal tạo dự án gợi ý hướng đọc tự động.
  - [x] Trang chi tiết `/projects/:id` (tab cấu hình, tab thành viên & lời mời).
  - [x] Typecheck & build sạch sẽ.

---

## 6. Tiêu chí nghiệm thu (Acceptance)

| # | Tiêu chí nghiệm thu | Kết quả |
|---|---|---|
| A1 | Migration tạo bảng `projects`, `project_members`, `project_invitations` và rollback được | ✅ Đạt |
| A2 | Tạo project thành công; người tạo tự động là `owner` trong `project_members` | ✅ Đạt |
| A3 | Quyền xem danh sách: Admin thấy mọi project; Root thấy project mình + của Sub; Sub chỉ thấy project của mình | ✅ Đạt |
| A4 | Không có quyền xem project thì trả về 404 (không lộ project) | ✅ Đạt |
| A5 | Chỉnh sửa project: Cả Owner và Member đều sửa được cấu hình | ✅ Đạt |
| A6 | Xoá mềm project (`deleted_at`): Ẩn khỏi danh sách mặc định | ✅ Đạt |
| A7 | Mời thành viên: Kiểm tra trùng lặp, chặn mời người đã là member | ✅ Đạt |
| A8 | Phản hồi lời mời: Chấp nhận $\rightarrow$ thành member; Từ chối $\rightarrow$ trạng thái declined | ✅ Đạt |
| A9 | Xoá thành viên: Owner xoá được Member; không thể tự xoá owner duy nhất | ✅ Đạt |
| A10 | Thống kê tổng / hoạt động / lưu trữ trả về cùng danh sách trong 1 request | ✅ Đạt |
| C1 | Giao diện hiển thị danh sách dạng thẻ/bảng, có tìm kiếm debounced, lọc comic_type | ✅ Đạt |
| C2 | Modal tạo/sửa project và trang chi tiết cấu hình / thành viên hoạt động hoàn hảo | ✅ Đạt |
| C3 | Typecheck (`npm run typecheck`) và Build (`npm run build`) vượt qua 100% | ✅ Đạt |
