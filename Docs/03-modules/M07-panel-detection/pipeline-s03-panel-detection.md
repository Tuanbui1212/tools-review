# S3 — Tách panel & thứ tự đọc

> Trạng thái: **DRAFT**

Bước nền móng để "hình khớp lời đọc" (xem [../../01-requirements/principles.md](../../01-requirements/principles.md)).

## Làm gì

- Phát hiện các khung tranh trong trang.
- Xác định **thứ tự đọc** theo setting hướng đọc: phải → trái (manga), trái → phải, trên → dưới (webtoon).
- Mỗi panel có ID riêng và toạ độ (bbox) trên ảnh gốc.

## Rủi ro

- Panel không có viền, panel tràn trang, panel chồng nhau.
- Có lỗi thì sửa tay trong App (công cụ chỉnh panel).

## Setting liên quan

[settings.md](settings.md)
