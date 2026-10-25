# Yêu cầu tổng quan

> Trạng thái: **DRAFT**

## Mục tiêu

Tool nhận **ảnh các chapter truyện tranh** và tự động tạo **video review** cho các chapter đó, với yêu cầu chất lượng nghiêm ngặt. Dùng được cho **nhiều loại truyện, nhiều ngôn ngữ, nhiều kiểu video** thông qua cấu hình (D002, D003).

## Đầu vào / Đầu ra

| | Mô tả |
|---|---|
| **Đầu vào** | Ảnh của một hoặc nhiều chapter, thuộc một Project truyện. Định dạng nạp cấu hình được. |
| **Đầu ra** | Video review: giọng đọc + hình ảnh chapter + chuyển cảnh khớp lời đọc. Định dạng cấu hình được. |

## Quy trình tổng quát

Nhận ảnh → đối chiếu chapter cũ của project → nhận diện nhân vật, lời thoại → lưu DB → tạo kịch bản → tạo giọng nói → dựng chuyển cảnh khớp giọng → xuất video.

Chi tiết: [../02-design/architecture/pipeline.md](../02-design/architecture/pipeline.md).

## Yêu cầu bắt buộc

- **Tự động tối đa**, có cổng duyệt bật/tắt được (D006).
- **3 cấp quyền** admin > root > sub (D007) — [../03-modules/M01-backend-foundation/roles.md](../03-modules/M01-backend-foundation/roles.md).
- **Mọi công đoạn cấu hình được** — setting của mỗi công đoạn nằm trong module tương ứng ([../03-modules/](../03-modules/)).
- **App + Web** (D005) — [../02-design/architecture/](../02-design/architecture/).
- **Chất lượng**:
  - Lời thoại nhận diện đúng.
  - Cốt truyện trong kịch bản đúng, không bịa.
  - Hình hiển thị đúng đoạn đang đọc, đúng chapter.
  - Chuyển cảnh hợp nhịp lời đọc.
