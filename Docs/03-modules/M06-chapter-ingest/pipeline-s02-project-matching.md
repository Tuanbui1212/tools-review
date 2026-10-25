# S2 — Đối chiếu với project

> Trạng thái: **DRAFT**

## Làm gì

- Xác định số chapter: từ tên thư mục, người nhập, hoặc tự đoán.
- **Chống trùng**: so perceptual hash ảnh với các chapter đã có. Trùng thì báo, cho chọn ghi đè / bỏ qua / tạo phiên bản mới.
- **Kiểm tra thứ tự**: cảnh báo thiếu chapter (có 1–5 và 7, thiếu 6).
- Nạp **bộ nhớ project** từ DB: nhân vật, glossary, tóm tắt các chapter trước.

## Đầu ra

Chapter đã gắn vào project, đúng số thứ tự, kèm bộ nhớ project cho các bước sau dùng.
