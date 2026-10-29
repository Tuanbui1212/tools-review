# Quy tắc làm việc

1. Mọi tính năng / thay đổi đều bắt đầu bằng tài liệu trong `Docs/`.
2. Mỗi tài liệu có trạng thái: `DRAFT` → `REVIEW` → `APPROVED`.
   - **DRAFT**: đang viết, đang bàn.
   - **REVIEW**: đã đủ ý, chờ chủ dự án duyệt.
   - **APPROVED**: đã chốt, được phép code theo.
3. Chỉ khi tài liệu liên quan đã `APPROVED` mới được code trong `main/` hoặc `client/`.
4. Muốn sửa tài liệu đã `APPROVED` thì đưa nó về `REVIEW` và ghi lý do.
5. Mọi quyết định quan trọng được ghi vào [decisions.md](decisions.md).
6. Câu hỏi còn mở nằm trong mục **"Câu hỏi còn mở"** của `spec.md` ở module liên quan. Trả lời xong thì ghi thành quyết định.
7. Làm **từng module một** theo [roadmap.md](roadmap.md) (D027). Module hiện tại chưa chốt thì chưa sang module khác.
8. Mỗi module gồm **cả backend lẫn giao diện** cho chức năng của nó (D051).
