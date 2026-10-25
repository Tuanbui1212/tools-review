# M09 — Setting nhân vật & quy trình duyệt (`character`, `workflow`)

> Trạng thái: **DRAFT** — đề xuất ban đầu, chốt khi làm M09 (sau khi thử model).

## Nhân vật (`character`)

| Setting | Giá trị ví dụ |
|---|---|
| Model nhận diện nhân vật | chọn trong danh sách |
| Ngưỡng tin cậy nhân vật | 0–1 |
| Ngưỡng tin cậy người nói | 0–1 |

## Quy trình duyệt (`workflow`)

M09 là module đầu tiên có cổng duyệt (Gate A), nên cơ chế duyệt được dựng ở đây. Gate B, C thêm vào ở M10, M12.

| Setting | Giá trị ví dụ |
|---|---|
| Mức tự động | Full auto / Kiểm duyệt kịch bản / Kiểm duyệt đầy đủ |
| Gate bật/tắt | A (M09), B (M10), C (M12) |
| Thông báo | khi bước xong / lỗi / chờ duyệt |
| Số lần tự thử lại khi lỗi | ví dụ 3 |

Công đoạn: [S5](pipeline-s05-character-recognition.md), [S6](pipeline-s06-data-linking.md), [cổng duyệt](../../02-design/architecture/quality-gates.md).
