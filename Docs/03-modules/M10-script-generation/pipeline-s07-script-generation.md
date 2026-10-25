# S7 — Sinh kịch bản review

> Trạng thái: **DRAFT**

## Đầu vào

Bản chép lời có cấu trúc (S6) + bộ nhớ project + setting kịch bản.

## Phong cách (D004)

| Phong cách | Mô tả |
|---|---|
| Dẫn truyện | Người dẫn kể lại tóm tắt |
| Đọc thoại | Đọc lại lời thoại, mỗi nhân vật một giọng |
| Kết hợp | Dẫn truyện là chính, chèn các câu thoại quan trọng |

## Định dạng đầu ra (bắt buộc)

Danh sách **segment**, mỗi segment gồm:

| Trường | Ý nghĩa |
|---|---|
| `type` | `narration` (dẫn) hoặc `dialogue` (thoại) |
| `speaker` | người dẫn hoặc ID nhân vật (để chọn giọng) |
| `text` | câu đọc |
| `panel_ids` | các panel minh hoạ cho câu đó |
| `emotion`, `pace` | gợi ý cảm xúc, nhịp |

## Chống bịa

- Mọi `panel_id` phải có thật và nằm đúng chapter.
- Tên nhân vật phải có trong thư viện nhân vật.
- Một lượt AI thứ hai đối chiếu kịch bản với lời thoại gốc để tìm chỗ sai sự thật.

## Sau khi xong

Cập nhật **tóm tắt chapter** vào bộ nhớ project.

## Gate B

Người dùng xem/sửa kịch bản trong App trước khi tạo giọng.

## Setting liên quan

[settings.md](settings.md)
