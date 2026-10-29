# Kiến trúc

> Trạng thái: **DRAFT** — theo D009, D014, D015, D016, D018, D022.

| File | Nội dung |
|---|---|
| [code-structure.md](code-structure.md) | **Cấu trúc code**: các service, BE layer, FE feature |
| [tech-stack.md](tech-stack.md) | **Tech stack**: bộ 3 Python/FastAPI + PostgreSQL + React/TypeScript |
| [overview.md](overview.md) | Sơ đồ tổng thể: App (xử lý) + Web (quản lý) + Main |
| [orchestration.md](orchestration.md) | **Main giao task cho các worker** (App worker + server worker) |
| [pipeline.md](pipeline.md) | Pipeline S1–S11 tổng thể, công đoạn nào thuộc module nào |
| [quality-gates.md](quality-gates.md) | Cổng duyệt A/B/C & mức tự động |
| [app-vs-web.md](app-vs-web.md) | Chức năng nào ở App, chức năng nào ở Web |
| [backend.md](backend.md) | Main: API Python + PostgreSQL |
| [app-engine.md](app-engine.md) | Engine xử lý pipeline chạy trong App |
| [frontend.md](frontend.md) | Công nghệ giao diện App + Web |
| [data-sync.md](data-sync.md) | Đồng bộ dữ liệu giữa máy người dùng và server |
| [ai-providers.md](ai-providers.md) | Model AI chạy local / API trả phí |
| [deployment.md](deployment.md) | Triển khai |
| [ports.md](ports.md) | **Danh sách port** của mọi service |
