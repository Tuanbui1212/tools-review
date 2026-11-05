# Module 06: Nhận diện Lời thoại & OCR (Speech Bubble Detection & Text OCR)

> **Trạng thái:** 📋 **THIẾT KẾ KIẾN TRÚC & CHUẨN BỊ TRIỂN KHAI**  
> **Công đoạn Pipeline:** S4 (Bóc tách bong bóng thoại & Nhận diện văn bản OCR)  
> **Phạm vi:** Worker AI (`worker-ai/`) + Main Backend API (`main/`) + Giao diện Web Dialogue Studio (`web/`)  
> **Đầu vào:** Các mảnh ảnh panel đã được cắt chuẩn hóa từ **Module 05**  
> **Đầu ra:** Dữ liệu lời thoại có toạ độ, phân loại (`speech`, `thought`, `narration`, `sfx`) và nội dung chữ chuẩn hóa để phục vụ **Module 07** (Gán nhân vật) và **Module 08** (Sinh kịch bản TTS).

---

## 1. Bảng Q&A Quyết định Thiết kế Kiến trúc (Design Decisions)

| # | Vấn đề kỹ thuật | Giải pháp tối ưu được lựa chọn | Lý do & Lợi ích |
|---|---|---|---|
| **Q1** | **Mô hình phát hiện bong bóng thoại (Bubble Detection)** | **`comic-text-detector` / YOLOv8-oriented text detection** | • Tối ưu riêng cho truyện tranh (Manga, Manhwa, Comic).<br>• Phát hiện cực nhạy cả bong bóng thoại oval, bong bóng đám mây, khung chữ nhật lẫn chữ tràn nền không viền.<br>• Chạy nhanh trên CPU lẫn GPU (~80–120ms / panel). |
| **Q2** | **Bộ máy nhận diện chữ (OCR Engine) đa ngôn ngữ** | **Kiến trúc Hybrid đa engine:**<br>• **Manga tiếng Nhật (`ja`):** `manga-ocr` (ViT + RoBERTa)<br>• **Tiếng Hàn (`ko`), Trung (`zh`), Anh (`en`), Việt (`vi`):** `PaddleOCR v4`<br>• **Fallback Cloud AI:** `Gemini 1.5 Flash` / `Google Cloud Vision` | • `manga-ocr` là chuẩn vàng hiện nay cho Manga Nhật: đọc hoàn hảo chữ viết dọc, font uốn lượn, Furigana nhỏ li ti.<br>• `PaddleOCR` siêu nhẹ, đọc rất chuẩn tiếng Trung, Hàn, Anh, Việt.<br>• Tuỳ chọn Cloud Fallback giúp người dùng máy yếu không cần tải model nặng. |
| **Q3** | **Thứ tự đọc các câu thoại trong cùng 1 panel (Reading Order)** | **Sắp xếp tự động theo hướng đọc cấu hình của Dự án (`reading_direction`)** | • **Manga (`rtl`):** Từ Trên xuống Dưới, cùng hàng thì Phải sang Trái.<br>• **Comic / Manhua (`ltr`):** Từ Trên xuống Dưới, cùng hàng thì Trái sang Phải.<br>• **Webtoon (`vertical`):** Theo trục dọc Y từ Trên xuống Dưới.<br>• Đảm bảo hội thoại giữa 2 nhân vật luôn đúng trình tự tự nhiên. |
| **Q4** | **Phân loại loại văn bản (Text Classification)** | **Phân tách 4 loại:**<br>1. `speech`: Thoại phát ra tiếng (bong bóng tròn/oval có đuôi)<br>2. `thought`: Suy nghĩ nội tâm (bong bóng đám mây, nét đứt)<br>3. `narration`: Dẫn truyện (hộp chữ nhật vuông ở góc)<br>4. `sfx`: Âm thanh tượng thanh (chữ hiệu ứng vẽ tay BÙM, KENG...) | Giúp các module sau:<br>• Dẫn truyện $\rightarrow$ TTS đọc giọng truyền cảm, khách quan.<br>• Suy nghĩ $\rightarrow$ TTS đọc giọng trầm/thì thầm.<br>• SFX $\rightarrow$ Có thể tắt đọc để tránh làm loãng video, hoặc gán hiệu ứng âm thanh (Audio FX). |
| **Q5** | **Xử lý sai chính tả tên riêng & thuật ngữ (Glossary)** | **Bộ từ điển thuật ngữ tự động (Project Glossary Replacement)** | Lưu danh sách từ khoá cố định theo bộ truyện (Tên nhân vật, chiêu thức, địa danh). Sau khi OCR xong, tự động chạy qua bộ lọc Regex/Fuzzy Matching để tự động sửa chính tả tên riêng (ví dụ `Ka-ka-ro-to` $\rightarrow$ `Kakarot`). |
| **Q6** | **Giao diện Web biên tập Lời thoại (Dialogue Studio)** | **Giao diện Đối chiếu Song song (Side-by-Side Split View)** | Cột giữa phóng to ảnh panel có vẽ khung toạ độ thoại; Cột phải là danh sách câu thoại dạng ô nhập liệu để sửa text nhanh, đổi loại thoại, kéo đổi thứ tự hoặc bấm xoá thoại rác chỉ bằng 1 cú click. |

---

## 2. Kiến trúc Luồng Dữ liệu (Data Flow)

```
[Web Client] ──(1) Bấm "Nhận diện lời thoại (OCR)"──> [Main API] ──(2) Tạo PipelineTask (ai_queue)──> [Redis Broker]
                                                                                                               │
[Web Client] <──(5) WebSocket báo tiến độ % <── [Redis Pub/Sub] <──(4) Báo % tiến độ ──────────────────── [worker-ai]
                                                                                                               │ 
                                                                    (3) Đọc ảnh panel từ đĩa ───────────────┘
                                                                        ▼
                                                                 [1. Text Detection] (Tìm toạ độ bong bóng)
                                                                        ▼
                                                                 [2. OCR Engine] (manga-ocr / PaddleOCR)
                                                                        ▼
                                                                 [3. Glossary Matching] (Sửa tên riêng)
                                                                        ▼
[Web Client] <──(7) Đối chiếu & Chỉnh sửa thoại ── [Main API] <──(6) Ghi danh sách thoại vào CSDL `panel_dialogues`
```

---

## 3. Thiết kế Cơ sở Dữ liệu (Database Schema)

### 3.1. Bảng `panel_dialogues` (Lưu từng câu thoại trong panel)

Migration: `20261105_0009_panel_dialogues.py`

```sql
CREATE TABLE panel_dialogues (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    chapter_page_id BIGINT NOT NULL REFERENCES chapter_pages(id) ON DELETE CASCADE,
    chapter_panel_id BIGINT NOT NULL REFERENCES chapter_panels(id) ON DELETE CASCADE,
    
    -- Thứ tự câu thoại trong panel (1, 2, 3...)
    dialogue_order INT NOT NULL DEFAULT 1,
    
    -- Toạ độ Bounding Box bong bóng thoại trên ảnh panel (pixel)
    bbox_x INT NOT NULL,
    bbox_y INT NOT NULL,
    bbox_width INT NOT NULL,
    bbox_height INT NOT NULL,
    polygon_points JSONB,                 -- Danh sách toạ độ đa giác nếu khung méo
    
    -- Phân loại thoại
    kind VARCHAR(32) NOT NULL DEFAULT 'speech', -- 'speech' | 'thought' | 'narration' | 'sfx'
    
    -- Nội dung chữ
    source_text TEXT NOT NULL,                  -- Văn bản OCR gốc từ hình ảnh
    clean_text TEXT NOT NULL,                   -- Văn bản sau khi lọc Glossary và người dùng sửa tay
    
    -- Độ tin cậy & Nguồn nhận diện
    ocr_confidence REAL DEFAULT 1.0,            -- Điểm tin cậy (0.0 -> 1.0)
    ocr_engine VARCHAR(64) DEFAULT 'ai',        -- 'manga-ocr' | 'paddleocr' | 'gemini' | 'manual'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_panel_dialogues_panel ON panel_dialogues(chapter_panel_id);
CREATE INDEX ix_panel_dialogues_chapter ON panel_dialogues(chapter_id);
```

### 3.2. Bảng `project_glossaries` (Từ điển thuật ngữ theo Dự án)

Migration: `20261105_0010_project_glossaries.py`

```sql
CREATE TABLE project_glossaries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    term_source VARCHAR(255) NOT NULL,          -- Từ OCR gốc hay nhận diện nhầm
    term_target VARCHAR(255) NOT NULL,          -- Từ chuẩn hóa thay thế
    category VARCHAR(64) DEFAULT 'character',   -- 'character' | 'skill' | 'location' | 'general'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_project_glossary_term UNIQUE (project_id, term_source)
);

CREATE INDEX ix_project_glossaries_project ON project_glossaries(project_id);
```

---

## 4. Danh sách API Backend (`main/app/controllers/dialogue_controller.py`)

### 4.1. Điều phối tác vụ OCR (AI Pipeline)
* `POST /api/v1/chapters/{chapter_id}/extract-dialogues`  
  * Đẩy task `ai.extract_dialogues` vào hàng đợi `ai_queue` của Celery.
  * Nhận diện toàn bộ bong bóng thoại cho tất cả panel trong chapter.
  * Trả về `task_id` phục vụ WebSocket tiến độ thời gian thực.
* `POST /api/v1/panels/{panel_id}/extract-dialogues`  
  * Chạy OCR riêng cho 1 panel duy nhất (phục vụ quét lại nhanh trong ~0.5s).

### 4.2. Lấy & Biên tập Dữ liệu Lời thoại
* `GET /api/v1/panels/{panel_id}/dialogues`  
  * Lấy danh sách toàn bộ câu thoại của 1 panel kèm toạ độ và nội dung chữ.
* `PUT /api/v1/panels/{panel_id}/dialogues`  
  * Ghi đè cập nhật danh sách lời thoại của panel sau khi người dùng sửa trên Web:
    * Thêm câu thoại mới.
    * Sửa nội dung text (`clean_text`).
    * Đổi loại (`speech`, `thought`, `narration`, `sfx`).
    * Sắp xếp lại thứ tự đọc (`dialogue_order`).
    * Xoá câu thoại rác.
* `GET /api/v1/chapters/{chapter_id}/dialogues`  
  * Lấy toàn bộ danh sách lời thoại của toàn bộ Chapter (phục vụ xuất file kịch bản hoặc tổng quan).

### 4.3. Quản lý Từ điển Thuật ngữ (Project Glossary)
* `GET /api/v1/projects/{project_id}/glossary` — Lấy danh sách từ điển của project.
* `POST /api/v1/projects/{project_id}/glossary` — Thêm cặp từ chuẩn hoá mới.
* `PUT /api/v1/projects/{project_id}/glossary/{term_id}` — Chỉnh sửa từ điển.
* `DELETE /api/v1/projects/{project_id}/glossary/{term_id}` — Xoá từ điển.

---

## 5. Thiết kế Giao diện Người dùng Web: Dialogue Studio (Tab Biên tập Lời thoại)

Giao diện sẽ được tích hợp thành **Tab thứ 3: "Biên tập lời thoại"** trong trang Chapter (kế bên Tab "Quản lý trang" và Tab "Cắt khung tranh").

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Header: Lời thoại & OCR (Module 06) • 199 khung tranh • 342 câu thoại nhận diện   [ Quét lại Chapter ] │
├─────────────────────────┬──────────────────────────────────────────┬───────────────────────────────────┤
│ CỘT 1: FILMSTRIP PANEL  │ CỘT 2: CANVAS SOI BONG BÓNG THOẠI        │ CỘT 3: TRÌNH BIÊN TẬP LỜI THOẠI   │
│ (Danh sách mảnh panel)  │ (Highlight khung toạ độ câu thoại)       │ (Gõ sửa text & chọn loại thoại)   │
│                         │                                          │                                   │
│ ┌─────────────────────┐ │ ┌──────────────────────────────────────┐ │ ┌───────────────────────────────┐ │
│ │ [Ảnh] Khung #1 (2 câu)│ │ │                                      │ │ │ #1 [ Lời thoại  ▼ ] [ Xoá 🗑️ ] │ │
│ ├─────────────────────┤ │ │  ┌──────────────┐                     │ │ │ "Ngươi không thể thoát đâu!"  │ │
│ │ [Ảnh] Khung #2 (1 câu)│ │ │  │ #1 Thoại     │                     │ │ ├───────────────────────────────┤ │
│ ├─────────────────────┤ │ │  └──────────────┘                     │ │ │ #2 [ Suy nghĩ   ▼ ] [ Xoá 🗑️ ] │ │
│ │ [Ảnh] Khung #3 (3 câu)│ │ │                   ┌──────────────┐   │ │ │ "(Hắn ta quá mạnh...)"        │ │
│ │ ...                 │ │ │                   │ #2 Suy nghĩ  │   │ │ ├───────────────────────────────┤ │
│ └─────────────────────┘ │ │                   └──────────────┘   │ │ │ [ + Thêm câu thoại ]          │ │
│                         │ │                                      │ │ │ [ Lưu lời thoại ]             │ │
│                         │ └──────────────────────────────────────┘ │ └───────────────────────────────┘ │
└─────────────────────────┴──────────────────────────────────────────┴───────────────────────────────────┘
```

### Các tính năng tương tác nổi bật trên Web:
1. **Highlight tương tác 2 chiều (Bidirectional Sync):**
   * Di chuột hoặc click vào ô thoại ở Cột 3 $\rightarrow$ Khung viền bong bóng thoại trên ảnh ở Cột 2 lập tức sáng đỏ/nhấp nháy để người dùng dễ đối chiếu mắt với chữ gốc.
   * Ngược lại, click vào bất kỳ bong bóng nào trên ảnh $\rightarrow$ Tự động cuộn đến và focus con trỏ vào ô nhập liệu tương ứng bên cột phải.
2. **Vẽ thêm bong bóng thoại bỏ sót:**
   * Nếu AI bỏ sót 1 câu thoại nhỏ, người dùng chỉ cần click nút `[+ Vẽ thêm thoại]` và quét chuột trên ảnh để tạo vùng chữ mới rồi gõ nội dung vào.
3. **Phân loại màu sắc trực quan:**
   * 🟢 **Xanh lá:** `Lời thoại` (Speech)
   * 🔵 **Xanh dương:** `Suy nghĩ` (Thought)
   * 🟠 **Cam:** `Dẫn chuyện` (Narration)
   * ⚪ **Xám:** `SFX` (Âm thanh hiệu ứng)
4. **Phím tắt nhanh:**
   * `Tab` / `Shift+Tab`: Chuyển nhanh giữa các câu thoại tiếp theo/trước đó.
   * `Ctrl + S`: Lưu nhanh lời thoại của panel hiện tại.
   * `Delete`: Xoá câu thoại rác đang chọn.

---

## 6. Kế hoạch Triển khai (Implementation Steps)

1. **Bước 1 (CSDL & Backend Core):**
   * Viết migration Alembic tạo bảng `panel_dialogues` và `project_glossaries`.
   * Định nghĩa model SQLAlchemy và Pydantic schemas.
   * Tạo Repository & Service cho `dialogue_service.py` và `glossary_service.py`.
2. **Bước 2 (Worker AI Task):**
   * Tích hợp thư viện text detection (`comic-text-detector` / `paddleocr`) trong `worker-ai`.
   * Tích hợp OCR engine (hỗ trợ `manga-ocr` cho tiếng Nhật và `PaddleOCR` cho tiếng Trung/Hàn/Anh/Việt).
   * Viết Celery task `ai.extract_dialogues` báo tiến độ % qua Redis.
3. **Bước 3 (Giao diện Web Frontend):**
   * Xây dựng API client và React Query hooks cho dialogues.
   * Tạo Component `DialogueCanvasViewer.tsx` (hiển thị ảnh panel + SVG overlays bong bóng thoại).
   * Tạo Component `DialogueEditorCard.tsx` (danh sách ô nhập text, selector loại thoại, nút xoá).
   * Tạo Tab `ChapterDialoguesTab.tsx` tích hợp đồng bộ vào trang quản lý Chapter.
4. **Bước 4 (Nghiệm thu & Đóng gói):**
   * Kiểm thử độ chính xác OCR trên các bộ truyện mẫu (Manga Nhật, Manhwa Hàn, Manhua Trung).
   * Kiểm thử khả năng sửa tay, thêm thoại mới, đổi loại thoại và lưu DB an toàn.
