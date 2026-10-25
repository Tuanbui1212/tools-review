# Đồng bộ dữ liệu

> Trạng thái: **REVIEW** — đã đồng ý (D019).

## Vấn đề

Pipeline chạy trên máy người dùng (D009), nhưng một project có nhiều người cùng làm (D011). Người được mời cần thấy ảnh, kịch bản, timeline mà người khác đã làm. Vì vậy phải có dữ liệu chung trên server.

## Đề xuất: cái gì lưu ở đâu

| Dữ liệu | Lưu trên server | Lưu ở máy |
|---|:-:|:-:|
| Thông tin project, chapter, thành viên, setting | ✅ | cache |
| Ảnh gốc chapter | ✅ | ✅ |
| Panel (toạ độ), lời thoại, nhân vật, kịch bản, timeline | ✅ (dữ liệu, nhẹ) | ✅ |
| Ảnh panel đã cắt | ❌ (cắt lại được từ ảnh gốc + toạ độ) | ✅ |
| Audio từng câu | tuỳ chọn | ✅ |
| Video cuối | ✅ | ✅ |
| File tạm khi render | ❌ | ✅ |

## Tránh hai người sửa cùng lúc

Đề xuất **khoá theo chapter**: một người mở chapter để sửa thì người khác chỉ xem được cho tới khi người đó xong (hoặc khoá hết hạn). Đơn giản và an toàn hơn so với cho sửa cùng lúc rồi gộp.
