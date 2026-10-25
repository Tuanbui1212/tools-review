# M01 — Nền tảng Main — Ghi chú

Vấn đề phát sinh, quyết định nhỏ trong lúc làm. Quyết định lớn thì ghi vào [../../00-process/decisions.md](../../00-process/decisions.md).

| Ngày | Ghi chú |
|---|---|
| 2026-10-25 | Khung `main/`, `worker/`, `client/` được dựng **trước** đặc tả M01 theo yêu cầu chủ dự án. Khung chỉ có hạ tầng + `/api/health`, chưa có nghiệp vụ. Đã kiểm tra: ruff, pytest (Main 2/2, Worker 2/2), `docker compose config`, FE typecheck + build. Chủ dự án tự chạy `docker compose up` sau. |
| 2026-10-25 | Máy phát triển chưa có `uv`, `pnpm`; khung được kiểm tra bằng pip + `npx pnpm@9.15.0`. |
| 2026-10-25 | Test hiện tại của `/api/health` mất ~18 giây khi không có dịch vụ nào chạy (chờ timeout kết nối). Khi làm hạ tầng test M01 sẽ giả lập các kết nối này. |
| 2026-10-25 | Đã giả lập kết nối trong test health → test chạy nhanh. |
| 2026-10-25 | **Refresh token là chuỗi ngẫu nhiên** (`secrets.token_urlsafe`), không phải JWT; DB lưu SHA-256. Access token là JWT HS256. An toàn hơn và thu hồi được ngay. |
| 2026-10-25 | Phát hiện "dùng lại token" chỉ áp dụng cho token **đã được đổi sang token mới qua refresh** (`replaced_by_id` có giá trị) → thu hồi mọi phiên. Token bị huỷ do logout / đổi mật khẩu / khoá thì chỉ trả 401 `refresh_token_revoked`. Lý do: test A8 phát hiện thiết bị khác refresh sau khi đổi mật khẩu sẽ làm mất luôn phiên mới của người vừa đổi. |
| 2026-10-25 | Luật "không khoá admin cuối cùng" luôn được bảo đảm nhờ luật "không tự khoá mình" (người khoá là admin đang hoạt động). Service vẫn giữ kiểm tra phòng hờ. |
| 2026-10-25 | Đổi mật khẩu / bị khoá: refresh token bị thu hồi ngay; access token cũ của người **bị khoá** bị từ chối ngay (kiểm tra `status` mỗi request). Với đổi mật khẩu, access token cũ còn dùng được tối đa 15 phút. |
| 2026-10-25 | Lần chạy đầu không có PostgreSQL: 13 đạt, 21 bỏ qua. Có PostgreSQL (container `crt-main-postgres-1`): phát hiện lỗi ở A8 (xem dòng trên), đã sửa. |
| 2026-10-25 | Thêm yêu cầu **đăng nhập 1 thiết bị** (D049): `users.session_version` + `refresh_tokens.revoked_reason`. Phát hiện "dùng lại token" giờ dựa vào `revoked_reason = 'rotated'`. Sửa thẳng migration 0001 vì chưa triển khai ở đâu. |
| 2026-10-25 | ⚠️ **Lưu ý cho M04/M05**: luật 1 phiên áp dụng chung cho Web và App. Mở Web khi App đang chạy pipeline sẽ đá App (App worker) ra. Cần chốt trước M04: 1 phiên chung, hay 1 phiên Web + 1 phiên App. |
| 2026-10-25 | ⚠️ **MinIO**: image `minio/minio` (Docker Hub) và `quay.io/minio/minio` đều không tải được nữa. Ứng viên S3 tương thích tải được: SeaweedFS, Garage, RustFS. Code dùng boto3/chuẩn S3 nên chỉ đổi image + cấu hình. Chờ chủ dự án chọn (ảnh hưởng D038). |
| 2026-10-25 | Smoke test trên Main thật (Docker, không MinIO): migration, create-admin, login, /auth/me, admin tạo root/sub, root chỉ thấy sub + mình, root tạo root bị chặn, máy A bị đá khi máy B đăng nhập — đều đạt. |
