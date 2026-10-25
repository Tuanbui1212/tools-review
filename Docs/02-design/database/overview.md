# Sơ đồ quan hệ

> Trạng thái: **DRAFT**

```
users ─┬─< project_members >─ projects ─┬─< characters ─< character_embeddings
       │                                ├─< glossary_terms
       └─< refresh_tokens               ├─< project_invitations
                                        ├─< compilations ─< compilation_items >─ renders
                                        └─< chapters ─┬─< pages ─< panels
                                                      ├─< text_regions          (thuộc panel)
                                                      ├─< character_appearances (thuộc panel)
                                                      ├─< scripts ─< script_segments ─┬─< segment_panels >─ panels
                                                      │                               └─< segment_audio
                                                      ├─< timelines ─< renders
                                                      ├─< tasks >─ workers
                                                      └─< gate_reviews

files            : mọi file (ảnh, audio, video) — được các bảng khác tham chiếu
presets, system_settings, ai_providers : cấu hình
audit_logs, ai_usage, usage_limits     : theo dõi
```

`A ─< B` nghĩa là một A có nhiều B.

## Luồng dữ liệu theo pipeline

| Bước | Ghi vào bảng |
|---|---|
| S1 | `files`, `pages` |
| S2 | `chapters` (số chapter, chống trùng bằng `pages.phash`) |
| S3 | `panels` |
| S4 | `text_regions` |
| S5 | `character_appearances`, `characters`, `character_embeddings` |
| S6 | `text_regions.speaker_character_id` |
| S7 | `scripts`, `script_segments`, `segment_panels`, `chapters.summary` |
| S8 | `segment_audio` |
| S9 | `timelines` |
| S10–S11 | `renders` |
| Gộp | `compilations`, `compilation_items` |
| Mọi bước | `tasks`, `workers`, `gate_reviews`, `audit_logs`, `ai_usage` |
