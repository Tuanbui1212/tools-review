# 03 — Modules

Khung folder của **tất cả** module đã được dựng sẵn theo lộ trình. Các file đang để trống; làm tới module nào thì điền nội dung module đó (D027). Thứ tự và trạng thái: [../00-process/roadmap.md](../00-process/roadmap.md).

## Cấu trúc một folder module

```
Mxx-<tên>/
├── spec.md         # Đặc tả: mục tiêu, phạm vi, ngoài phạm vi, thiết kế
├── acceptance.md   # Tiêu chí nghiệm thu: thế nào là "xong"
├── tasks.md        # Danh sách việc cần làm khi code
├── notes.md        # Ghi chú, vấn đề phát sinh trong lúc làm
├── settings.md     # Setting của công đoạn (nếu có)
└── pipeline-*.md   # Mô tả công đoạn pipeline mà module làm (nếu có)
```

Module nền có thêm file riêng: M01 có `roles.md`, `permission-matrix.md`; M02 có `project-roles.md`, `settings-layers.md`.

Phần đã soạn sẵn trong các file này là **đề xuất ban đầu**. Làm tới module nào thì dựa vào đó phát triển tiếp và chốt (D028).

Mẫu gốc: [_template/](_template/).

## Danh sách module

| # | Module | Folder | Trạng thái |
|---|---|---|---|
| M01 | Nền tảng Main | [M01-backend-foundation/](M01-backend-foundation/) | 🧪 |
| M02 | Project & thành viên | [M02-projects-members/](M02-projects-members/) | ⏳ |
| M03 | Web quản lý (khung) | [M03-web-shell/](M03-web-shell/) | ⏳ |
| M04 | App + engine (khung) | [M04-app-engine-shell/](M04-app-engine-shell/) | ⏳ |
| M05 | Điều phối task | [M05-orchestration/](M05-orchestration/) | ⏳ |
| M06 | Nhập chapter (S1–S2) | [M06-chapter-ingest/](M06-chapter-ingest/) | ⏳ |
| M07 | Tách panel (S3) | [M07-panel-detection/](M07-panel-detection/) | ⏳ |
| M08 | Lời thoại (S4) | [M08-dialogue-ocr/](M08-dialogue-ocr/) | ⏳ |
| M09 | Nhân vật (S5–S6) | [M09-character-recognition/](M09-character-recognition/) | ⏳ |
| M10 | Kịch bản (S7) | [M10-script-generation/](M10-script-generation/) | ⏳ |
| M11 | Giọng đọc (S8) | [M11-voice-tts/](M11-voice-tts/) | ⏳ |
| M12 | Timeline & render (S9–S11) | [M12-timeline-render/](M12-timeline-render/) | ⏳ |
| M13 | Gộp video | [M13-video-merge/](M13-video-merge/) | ⏳ |
| M14 | Theo dõi & thống kê | [M14-tracking-stats/](M14-tracking-stats/) | ⏳ |
| M15 | Đóng gói Electron | [M15-electron-packaging/](M15-electron-packaging/) | ⏳ |

Trạng thái: ⏳ chưa bắt đầu · 📝 đang đặc tả · 🔨 đang code · 🧪 nghiệm thu · ✅ đã chốt
