# M02 — Cơ chế cấu hình theo tầng

> Trạng thái: **DRAFT** — đề xuất ban đầu, chốt khi làm M02.

M02 chỉ dựng **cơ chế** lưu và kế thừa setting. **Nội dung** setting của từng công đoạn do module của công đoạn đó tự định nghĩa (D028).

## Các tầng

Setting kế thừa từ trên xuống, tầng dưới ghi đè tầng trên:

```
1. Mặc định hệ thống      (admin quản lý)
2. Preset                 (mẫu dựng sẵn — làm ở M14)
3. Project                (cấu hình riêng của từng truyện — làm ở M02)
4. Chapter / lần chạy     (ghi đè tạm thời cho một chapter)
```

## Quy tắc

- Setting chia theo **nhóm**, mỗi module sở hữu một nhóm (`ingest`, `panel`, `ocr`, `character`, `script`, `voice`, `video`, `merge`, `workflow`).
- Mỗi nhóm có **schema** riêng (kiểu dữ liệu, giá trị mặc định, giá trị hợp lệ) để kiểm tra trước khi chạy.
- admin quyết định **danh sách lựa chọn** (model nào, giọng nào được dùng); user chỉ chọn trong danh sách đó.
- Mỗi lần chạy lưu **snapshot cấu hình** để biết kết quả được tạo với setting nào và tạo lại được.

## Setting của project làm trong M02

| Setting | Giá trị ví dụ |
|---|---|
| Tên, mô tả | |
| Loại truyện | manga, manhwa, manhua, webtoon, comic, truyện Việt |
| Hướng đọc | phải → trái, trái → phải, trên → dưới (tự điền theo loại truyện) |
| Ngôn ngữ chữ trong ảnh | vi, en, ja, ko, zh… |
| Ngôn ngữ đầu ra | vi, en… |
| Thể loại | hành động, tình cảm, kinh dị, hài… |

## Setting theo từng module

| Nhóm | Module |
|---|---|
| ingest | [M06](../M06-chapter-ingest/settings.md) |
| panel | [M07](../M07-panel-detection/settings.md) |
| ocr | [M08](../M08-dialogue-ocr/settings.md) |
| character, workflow | [M09](../M09-character-recognition/settings.md) |
| script | [M10](../M10-script-generation/settings.md) |
| voice | [M11](../M11-voice-tts/settings.md) |
| video | [M12](../M12-timeline-render/settings.md) |
| merge | [M13](../M13-video-merge/settings.md) |
