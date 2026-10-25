# Pipeline xử lý (tổng thể)

> Trạng thái: **DRAFT**

Toàn bộ pipeline chạy **trên App, ở máy người dùng** (D009). App gửi trạng thái từng bước lên backend để Web xem tiến độ.

```
[Upload ảnh vào App]
   ▼
S1  Tiếp nhận & chuẩn hoá
S2  Đối chiếu với project (chapter cũ, bộ nhớ project)
S3  Tách panel & thứ tự đọc
S4  Nhận diện lời thoại (OCR)      ┐ chạy song song
S5  Nhận diện nhân vật             ┘
S6  Gắn kết thoại ↔ nhân vật ↔ panel → DB      ◆ Gate A
S7  Sinh kịch bản review                        ◆ Gate B
S8  Tạo giọng nói + timestamp
S9  Dựng timeline (panel ↔ câu đọc ↔ hiệu ứng)
S10 Render video
S11 Kiểm tra chất lượng tự động → xuất          ◆ Gate C
```

| Bước | Công đoạn | Module | Chi tiết |
|---|---|---|---|
| S1 | Tiếp nhận & chuẩn hoá ảnh | M06 | [xem](../../03-modules/M06-chapter-ingest/pipeline-s01-ingest.md) |
| S2 | Đối chiếu với project | M06 | [xem](../../03-modules/M06-chapter-ingest/pipeline-s02-project-matching.md) |
| S3 | Tách panel & thứ tự đọc | M07 | [xem](../../03-modules/M07-panel-detection/pipeline-s03-panel-detection.md) |
| S4 | Nhận diện lời thoại | M08 | [xem](../../03-modules/M08-dialogue-ocr/pipeline-s04-ocr.md) |
| S5 | Nhận diện nhân vật | M09 | [xem](../../03-modules/M09-character-recognition/pipeline-s05-character-recognition.md) |
| S6 | Gắn kết dữ liệu | M09 | [xem](../../03-modules/M09-character-recognition/pipeline-s06-data-linking.md) |
| S7 | Sinh kịch bản | M10 | [xem](../../03-modules/M10-script-generation/pipeline-s07-script-generation.md) |
| S8 | Tạo giọng nói | M11 | [xem](../../03-modules/M11-voice-tts/pipeline-s08-tts.md) |
| S9 | Dựng timeline | M12 | [xem](../../03-modules/M12-timeline-render/pipeline-s09-timeline.md) |
| S10 | Render video | M12 | [xem](../../03-modules/M12-timeline-render/pipeline-s10-render.md) |
| S11 | Kiểm tra chất lượng & xuất | M12 | [xem](../../03-modules/M12-timeline-render/pipeline-s11-qc-export.md) |
| Gộp | Gộp video chapter thành thành phẩm | M13 | [xem](../../03-modules/M13-video-merge/pipeline-merge.md) |

Cổng duyệt & mức tự động: [quality-gates.md](quality-gates.md).
