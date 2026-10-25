# Model AI

> Trạng thái: **DRAFT** — theo D009, D010.

## Lớp adapter

Mỗi công đoạn AI gọi qua một **adapter**. Đổi model / nhà cung cấp chỉ cần đổi cấu hình (admin quản lý), không phải sửa code.

## Đề xuất cho từng công đoạn

| Công đoạn | Đề xuất | Chạy ở |
|---|---|---|
| Tách panel, bóng thoại | Model detect chuyên cho truyện tranh | App (local) |
| OCR | Model OCR mở theo ngôn ngữ; LLM đọc ảnh để xử lý chỗ khó | App + API |
| Nhận diện nhân vật | Embedding mặt + clustering; LLM đọc ảnh hỗ trợ khi không chắc | App + API |
| Kịch bản, dịch, kiểm tra bịa | LLM trả phí (Claude…), chất lượng cao | API |
| TTS | Dịch vụ TTS trả phí có giọng tiếng Việt tốt | API |
| Speech-to-text (QC) | Whisper chạy local | App (local) |
| Render | ffmpeg | App (local) |

Model cụ thể sẽ chọn và thử nghiệm trong `Docs/08-ai-evaluation/`, so sánh chất lượng trên vài chapter mẫu trước khi chốt.

## Gọi API trả phí qua backend

```
App ──► Backend (kiểm tra quyền, giữ API key, ghi chi phí) ──► Nhà cung cấp AI
```

- API key không nằm trên máy người dùng.
- Mọi lần gọi đều ghi: user, project, công đoạn, lượng dùng, chi phí.
- Admin đặt được hạn mức chi phí theo user / project.
