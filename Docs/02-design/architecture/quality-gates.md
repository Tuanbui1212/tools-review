# Cổng duyệt & mức tự động

> Trạng thái: **REVIEW** — theo D006, D013.

## Các gate

| Gate | Vị trí | Duyệt gì | Làm ở đâu |
|---|---|---|---|
| A | Sau S6 | Nhận diện: panel, OCR, nhân vật | App |
| B | Sau S7 | Kịch bản | App (sửa), Web (duyệt nhanh) |
| C | Sau S11 | Video cuối | App hoặc Web |

## Ai được duyệt

Owner, member của project, root và admin (D013). Sub là member thì tự duyệt được.

## Mức tự động (chọn theo project)

| Mức | Hành vi |
|---|---|
| Full auto | Không dừng, trừ khi điểm tin cậy dưới ngưỡng tối thiểu |
| Kiểm duyệt kịch bản | Chỉ dừng ở Gate B (đề xuất mặc định) |
| Kiểm duyệt đầy đủ | Dừng ở cả 3 gate |

## Khi bị từ chối ở gate

Người duyệt ghi lý do → sửa → pipeline chạy lại từ bước bị ảnh hưởng, không chạy lại từ đầu.
