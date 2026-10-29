# Nhật ký quyết định

> Không sửa quyết định cũ; nếu đổi ý thì thêm quyết định mới ghi rõ "thay thế Dxxx".

| # | Ngày | Quyết định | Nguồn | Người chốt |
|---|---|---|---|---|
| D001 | 2026-10-25 | Dự án chia 3 phần: `Docs/`, `server/`, `client/`. Docs phải `APPROVED` trước khi code. | Yêu cầu ban đầu | Chủ dự án |
| D002 | 2026-10-25 | Hỗ trợ nhiều loại truyện. Loại truyện, hướng đọc, ngôn ngữ nguồn/đích, định dạng đầu vào/đầu ra đều **cấu hình được**. | Q1 | Chủ dự án |
| D003 | 2026-10-25 | Đầu ra video (nền tảng, tỉ lệ khung, độ dài, ngôn ngữ giọng đọc…) **cấu hình được**, có preset. | Q2 | Chủ dự án |
| D004 | 2026-10-25 | Kịch bản có nhiều phong cách để chọn: dẫn truyện, đọc thoại nhân vật (nhiều giọng), kết hợp. | Q3 | Chủ dự án |
| D005 | 2026-10-25 | Client gồm 2 phần: **App** (thiết kế, chỉnh sửa) và **Web** (quản lý quy trình, các công đoạn). | Q4 | Chủ dự án |
| D006 | 2026-10-25 | Mô hình tự động + cổng duyệt (Gate A/B/C) bật/tắt được, mức tự động chọn theo project. | Q5 | Chủ dự án |
| D007 | 2026-10-25 | Cấp quyền: **admin** (thấy tất cả) > **root** (quản lý, theo dõi sub) > **sub** (project của mình + project được mời). | Q6 | Chủ dự án |
| D008 | 2026-10-25 | Docs chia thành folder theo chủ đề, mỗi file một chủ đề, không để file quá to. | Yêu cầu | Chủ dự án |
| D009 | 2026-10-25 | **Phần xử lý nặng (AI, render) chạy trên máy người dùng, trong App.** Web chỉ quản lý và xem tiến độ. | Q4b, Q16 | Chủ dự án |
| D010 | 2026-10-25 | Chấp nhận dùng API AI trả phí. | Q4b | Chủ dự án |
| D011 | 2026-10-25 | Root thấy **tất cả** sub (không chia nhóm). Root tạo project và mời root khác, sub khác vào cùng project. | Q12 | Chủ dự án |
| D012 | 2026-10-25 | Root và admin có toàn quyền trong mọi project mà họ xem được. | Q14 | Chủ dự án |
| D013 | 2026-10-25 | Thành viên project (kể cả sub) có quyền như editor, được duyệt gate. Bỏ các vai trò reviewer / viewer. | Q15, Q13 | Chủ dự án |
| D014 | 2026-10-25 | App chạy trên **Windows**. | Q16 | Chủ dự án |
| D015 | 2026-10-25 | App và Web dùng **chung một backend**. Chấp nhận cách chia chức năng đã đề xuất. | Q17 | Chủ dự án |
| D016 | 2026-10-25 | Backend: **Python**. Database: **PostgreSQL**. Frontend: chờ chốt (xem `05-architecture/frontend.md`). | Yêu cầu | Chủ dự án |
| D017 | 2026-10-25 | Bỏ các phần không cần: vai trò reviewer/viewer, chia nhóm root, worker/job queue trên server, phương án backend Node.js. | Yêu cầu | Chủ dự án |
| D018 | 2026-10-25 | Giao diện App và Web dùng **React + TypeScript**, chung code (`client/shared`). App đóng gói bằng **Electron**. | Q20 | Chủ dự án |
| D019 | 2026-10-25 | DB (PostgreSQL) và file dùng chung nằm trên **server trung tâm**: ảnh gốc, dữ liệu pipeline, video cuối. Khoá theo chapter khi sửa. | Q21 | Chủ dự án |
| D020 | 2026-10-25 | Máy người dùng có GPU NVIDIA; model AI local chạy bằng GPU. | Q19 | Chủ dự án |
| D021 | 2026-10-25 | Root **không** thấy project của root khác nếu chưa được mời. | Q23 | Chủ dự án |
| D022 | 2026-10-25 | App giai đoạn đầu chạy dạng **web local** (engine Python phục vụ giao diện tại `localhost`); bọc **Electron** khi pipeline ổn. Code giao diện giữ nguyên. | Q25 | Chủ dự án |
| D023 | 2026-10-25 | Số chapter là **số nguyên**, không dùng số thập phân. | Q26 | Chủ dự án |
| D024 | 2026-10-25 | **Mỗi chapter làm thành một video riêng.** Có chức năng **gộp video** để ghép nhiều video chapter thành thành phẩm. | Q26 | Chủ dự án |
| D025 | 2026-10-25 | Kịch bản và timeline giữ **lịch sử phiên bản**, quay lại bản cũ được. | Q26 | Chủ dự án |
| D026 | 2026-10-25 | Xoá project / chapter là **xoá mềm**, khôi phục được. | Q26 | Chủ dự án |
| D027 | 2026-10-25 | Làm **từng module một**: đặc tả → duyệt → code → nghiệm thu → chốt, rồi mới sang module tiếp theo. Không dựng toàn bộ hệ thống một lần. | Yêu cầu | Chủ dự án |
| D028 | 2026-10-25 | Bỏ folder `03-roles/` và `04-settings/`. Quyền và setting chuyển vào module tương ứng; làm tới module nào thì phát triển và chốt phần đó. | Yêu cầu | Chủ dự án |
| D029 | 2026-10-25 | Bỏ folder pipeline: mô tả từng công đoạn chuyển vào module tương ứng; pipeline tổng thể và cổng duyệt vào `02-design/architecture/`. | Yêu cầu | Chủ dự án |
| D030 | 2026-10-25 | Bỏ folder câu hỏi: câu hỏi còn mở nằm trong `spec.md` của module liên quan; câu đã trả lời đã ghi thành quyết định ở file này. | Yêu cầu | Chủ dự án |
| D031 | 2026-10-25 | Docs đánh số theo quy trình: `00-process` → `01-requirements` → `02-design` (kiến trúc + database) → `03-modules`. | Yêu cầu | Chủ dự án |
| D032 | 2026-10-25 | Toàn bộ ID trong DB là **số tự nhiên** (`BIGINT` tự tăng), không dùng UUID. Chỉ server sinh ID. | Yêu cầu (hiệu năng) | Chủ dự án |
| D033 | 2026-10-25 | Chốt tech stack bộ 3: **Python + FastAPI**, **PostgreSQL**, **React + TypeScript**. | Bàn tech stack | Chủ dự án |
| D034 | 2026-10-25 | Thư viện được chọn thoải mái theo nhu cầu; UI mặc định dùng Ant Design. | Bàn tech stack | Chủ dự án |
| D035 | 2026-10-25 | Khi phát triển, PostgreSQL (và các dịch vụ khác) chạy bằng **Docker Desktop + Docker Compose**. | Bàn tech stack | Chủ dự án |
| D036 | 2026-10-25 | Server dùng **Celery + Redis + Flower** cho việc chạy nền (gọi AI trả phí, xử lý file, việc định kỳ, thông báo). **Thay thế một phần D017.** Engine trên App **không** dùng Celery (Celery không hỗ trợ Windows chính thức), dùng hàng đợi nhẹ lưu bằng SQLite. | Bàn tech stack | Chủ dự án |
| D037 | 2026-10-25 | Tài liệu API dùng **Swagger UI** có sẵn của FastAPI (`/docs`, `/redoc`). | Bàn tech stack | Chủ dự án |
| D038 | 2026-10-25 | File dùng chung lưu trên server bằng **MinIO** (chuẩn S3, chạy Docker). Máy người dùng dùng thư mục làm việc do engine quản lý + SQLite ghi trạng thái file. | Bàn tech stack | Chủ dự án |
| D039 | 2026-10-25 | **Main là bot tổng**: chia pipeline mỗi chapter thành task, giao cho **App worker** (engine trên máy người dùng) và **server worker** (Celery), theo dõi tới khi xong. | Bàn kiến trúc | Chủ dự án |
| D040 | 2026-10-25 | Task chạy trên App chỉ giao cho **máy của chính người bấm chạy**, không giao sang máy người khác. | Bàn kiến trúc | Chủ dự án |
| D041 | 2026-10-25 | Đổi folder code `server/` thành **`main/`** (thay phần tên folder trong D001). | Bàn kiến trúc | Chủ dự án |
| D042 | 2026-10-25 | Dùng **một repo git chung** cho `Docs/`, `main/`, `client/`. | Bàn tech stack | Chủ dự án |
| D043 | 2026-10-25 | Tách phần điều phối thành module riêng **M05 – Điều phối task**; các module sau dời số (M05→M06 … M14→M15). | Bàn kiến trúc | Chủ dự án |
| D044 | 2026-10-25 | Backend theo **kiến trúc layer**: controllers → services → repositories → models, kèm schemas, integrations/clients, core. | Dựng khung | Chủ dự án |
| D045 | 2026-10-25 | **Worker là service riêng** (`worker/`), chạy trên server khác, không chạy trong Main. Main chỉ đẩy task vào Redis theo tên; worker không truy cập DB của Main, mọi dữ liệu qua API của Main. | Dựng khung | Chủ dự án |
| D046 | 2026-10-25 | Hướng **microservice**, mọi service backend dùng **FastAPI**. Mỗi service có code, Dockerfile, docker-compose, test riêng. | Dựng khung | Chủ dự án |
| D047 | 2026-10-25 | Frontend theo **kiến trúc feature** (`features/<tên>/` gồm api, hooks, components, pages, types, index). | Dựng khung | Chủ dự án |
| D048 | 2026-10-25 | Duyệt đặc tả **M01**: root không quản lý root khác; đăng nhập bằng username hoặc email; access 15 phút, refresh 7 ngày; chưa có tự đăng ký và quên mật khẩu qua email. | M01 | Chủ dự án |
| D049 | 2026-10-25 | **Mỗi tài khoản chỉ đăng nhập 1 thiết bị**: đăng nhập ở nơi mới thì phiên cũ bị đá ra ngay. | Yêu cầu khi làm M01 | Chủ dự án |
| D050 | 2026-10-25 | Tạm **giữ nguyên MinIO** trong cấu hình dù image hiện không tải được; **sửa khi bắt đầu dùng kho file** (M06 – nhập chapter). Đã ghi vào câu hỏi mở của M06. | Bàn sau M01 | Chủ dự án |
| D051 | 2026-10-25 | **Mỗi module gồm cả backend lẫn giao diện** cho chức năng của nó. M01 bổ sung giao diện Web: đăng nhập, giữ phiên, đổi mật khẩu, quản lý user. | Yêu cầu | Chủ dự án |
| D052 | 2026-10-25 | Bỏ module "Web quản lý (khung)" (M03 cũ) vì đã chia vào M01, M02. Các module sau dời số: M04→M03 … M15→M14. Các quyết định cũ ghi số theo cách đánh cũ (ví dụ D050 "M06" nay là **M05**). | Yêu cầu | Chủ dự án |
| D053 | 2026-10-25 | Đăng nhập: **1 phiên Web + 1 phiên App**, Web và App không đá nhau; cùng loại client thì phiên mới đá phiên cũ. Thay thế phạm vi của D049. Refresh token lưu `localStorage`. Duyệt giao diện M01 (5.8). | M01 | Chủ dự án |
| D054 | 2026-10-25 | Giao diện theo phong cách **"Studio làm phim"**: nền tối, dải màu cam–hồng, hoạ tiết dải phim, font Be Vietnam Pro, có hiệu ứng chuyển động (tự tắt khi bật giảm chuyển động). Theme và thành phần đặt trong `client/shared`, dùng chung Web + App. Xem `02-design/ui/design-system.md`. | Yêu cầu | Chủ dự án |
| D055 | 2026-10-27 | **Loại bỏ App và folder `client/`**, chuyển giao diện Web duy nhất ra root thành `web/`. Xây dựng các tính năng pipeline dưới dạng các service/worker backend và giao diện Web tập trung. Đóng gói App sẽ xem xét sau khi pipeline hoàn chỉnh. Thay thế một phần D005, D014, D018, D022. | Yêu cầu | Chủ dự án |
