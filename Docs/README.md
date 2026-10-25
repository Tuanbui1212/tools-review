# Comic Review Tool — Docs

Nơi **bàn luận, lên kế hoạch và chốt** mọi thứ trước khi code. Quy tắc làm việc: [00-process/working-rules.md](00-process/working-rules.md).

## Cấu trúc dự án

```
tools/
├── Docs/          # Bàn luận, kế hoạch, đặc tả
├── main/          # Main: bot tổng điều phối + API (Python, PostgreSQL)
└── client/
    ├── app/       # App Windows: chạy pipeline, chỉnh sửa
    ├── web/       # Web: quản lý, xem tiến độ
    └── shared/    # Code giao diện dùng chung
```

## Docs — đọc theo thứ tự quy trình

| Bước | Folder | Nội dung | Trạng thái |
|---|---|---|---|
| 0 | [00-process/](00-process/) | Quy tắc làm việc, lộ trình module, nhật ký quyết định | — |
| 1 | [01-requirements/](01-requirements/) | Yêu cầu: mục tiêu, phạm vi, nguyên tắc | DRAFT |
| 2 | [02-design/](02-design/) | Thiết kế tổng thể: kiến trúc, pipeline, cổng duyệt, database | REVIEW |
| 3 | [03-modules/](03-modules/) | Từng module: đặc tả, setting, quyền, nghiệm thu — làm lần lượt theo [00-process/roadmap.md](00-process/roadmap.md) | — |

## Quy ước

- Mỗi folder có `README.md` làm mục lục.
- Mỗi file chỉ nói **một chủ đề**, không để file quá to.
- Đầu mỗi file ghi trạng thái: `DRAFT` / `REVIEW` / `APPROVED`.
- Câu hỏi còn mở nằm trong mục "Câu hỏi còn mở" ở `spec.md` của module liên quan.
