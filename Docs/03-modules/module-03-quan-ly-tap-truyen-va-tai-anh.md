# Module 03: Quản lý Tập truyện & Tải ảnh (Chapters & Image Ingestion)

> **Trạng thái:** 📝 **ĐÃ CHỐT ĐẶC TẢ Q&A (Sẵn sàng triển khai)**  
> **Công đoạn Pipeline:** S1 (Tiếp nhận & Lưu trữ ảnh) — S2 (Sắp xếp & Quản lý trang gốc)  
> **Phạm vi:** Backend API (`main/`) + Giao diện Web (`web/`)

---

## 1. Bảng Q&A Quyết định Thiết kế (Đã thống nhất với Chủ dự án)

| # | Vấn đề | Quyết định đã chốt | Chi tiết triển khai |
|---|---|---|---|
| **Q1** | **Nơi lưu file ảnh vật lý** | **Lưu tại ổ đĩa server** (Local Storage) | Lưu vào thư mục `main/storage/projects/{project_id}/chapters/{chapter_id}/pages/`, được mount volume Docker. Sang Module 04 mới chuyển sang MinIO. |
| **Q2** | **Thêm ảnh & Sắp xếp** | **Mặc định thêm cuối + Kéo thả linh hoạt** | Ảnh mới tải lên tự động nối vào cuối danh sách trang. Cho phép kéo thả vào vị trí bất kỳ. Hỗ trợ cả **Xoá từng ảnh** và **Xoá tất cả ảnh** (xoá sạch làm lại). |
| **Q3** | **Ảnh dài Webtoon** | **Chỉ lưu & Giữ nguyên ảnh gốc** | Không can thiệp cắt xén ảnh ở Module 03. Chỉ lưu trữ và hiển thị. Việc cắt panel sẽ kích hoạt qua nút trigger ở Module 05. |
| **Q4** | **Trang trùng lặp (SHA-256)** | **Vẫn lưu & Hiện cảnh báo vàng** | Nếu 2 ảnh trùng mã băm SHA-256 (chọn nhầm file), hệ thống vẫn lưu đầy đủ nhưng gắn cờ cảnh báo trên Web để người dùng tự quyết định xoá hay giữ. |

---

## 2. Mục tiêu

Xây dựng toàn bộ phân hệ quản lý tập truyện (Chapter) và quy trình tiếp nhận, tải lên (upload), lưu trữ và sắp xếp ảnh truyện tranh cho từng dự án:
- **Quản lý Chapter**: Tạo chapter, cập nhật thông tin, theo dõi trạng thái (`draft`, `ready`, `processing`, `completed`), hỗ trợ xoá mềm.
- **Tiếp nhận ảnh linh hoạt**: Kéo thả nhiều file ảnh đồng thời hoặc tải lên 1 file nén ZIP.
- **Kiểm soát chất lượng & An toàn**: Kiểm tra định dạng thật (Magic bytes), chặn file độc hại, lọc bỏ file rác trong ZIP (`.DS_Store`, `__MACOSX`), sắp xếp thứ tự trang tự nhiên (Natural Sort).
- **Trải nghiệm giao diện Web**: Quản lý danh sách chapter của dự án, khu vực upload trực quan, lưới xem trước trang truyện (Gallery Thumbnail Grid), kéo thả thay đổi thứ tự trang, phóng to xem ảnh gốc, xoá từng ảnh hoặc xoá tất cả.

---

## 3. Các quy tắc nghiệp vụ & Điều kiện chặn chẽo (Business Rules)

### 3.1. Quyền thao tác (RBAC & Project Policy)
- **Kiểm tra quyền truy cập Project**:
  - Chỉ thành viên của project (`owner`, `member`), hoặc người quản lý (`admin`, `root` tạo ra owner) mới có quyền xem danh sách chapter, tạo chapter mới, tải ảnh hoặc sửa/xoá chapter.
  - Người không thuộc project khi truy cập API chapter sẽ bị trả về `404 Not Found` (không làm lộ sự tồn tại của dữ liệu).
- **Quyền xoá chapter**: Chỉ `owner` của project hoặc `admin`/`root` quản lý mới có quyền xoá chapter. Member có quyền tạo chapter, upload ảnh, sắp xếp trang và xoá ảnh trong chapter.

### 3.2. Quy tắc đánh số & Đặt tên Chapter
- **Số chapter (`chapter_number`)**:
  - Bắt buộc là **số nguyên dương** $\ge 1$ (theo quyết định D023, chặn nhập số âm hoặc số thập phân như 1.5, 12.1).
  - Trong cùng một Project, **không được phép trùng `chapter_number`** giữa các chapter đang hoạt động (`deleted_at IS NULL`).
- **Tiêu đề chapter (`title`)**: Tối đa 255 ký tự, có thể để trống (mặc định hiển thị "Chapter {chapter_number}").
- **Vòng đời trạng thái Chapter (`status`)**:
  - `draft`: Chapter mới tạo, chưa có ảnh nào.
  - `ready`: Đã có ảnh, đã được người dùng kiểm tra và sẵn sàng để chạy pipeline xử lý AI.
  - `processing`: Đang trong tiến trình chạy pipeline AI (cắt panel, OCR, kịch bản...).
  - `completed`: Đã hoàn thành xuất video thành phẩm.
  - `error`: Quá trình xử lý bị lỗi.

### 3.3. Quy tắc kiểm duyệt file upload & Chống gian lận
- **Định dạng file ảnh cho phép**: Chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`. Chặn hoàn toàn file thực thi, file rác (`exe`, `pdf`, `gif`, `svg`).
- **Xác thực Magic Bytes thực tế**: Bắt buộc đọc header nhị phân của file bằng thư viện xử lý ảnh (Pillow) để ngăn chặn hành vi đổi đuôi file mã độc.
- **Giới hạn dung lượng & Số lượng**:
  - Dung lượng tối đa mỗi ảnh đơn lẻ: **20 MB**.
  - Dung lượng tối đa file nén ZIP: **300 MB**.
  - Số trang tối đa cho 1 chapter: **300 trang**.
- **Cơ chế an toàn khi giải nén ZIP (Anti Zip-Bomb)**:
  - Kiểm tra tỉ lệ nén trước khi bung file (nếu tỉ lệ nén > 100 lần hoặc tổng dung lượng giải nén > 1 GB thì từ chối ngay).
  - Tự động bỏ qua các file/thư mục ẩn của hệ điều hành: `__MACOSX/`, `.DS_Store`, `Thumbs.db`, `desktop.ini`.
  - Tự động bỏ qua các file không phải là ảnh mà không làm gián đoạn việc nạp các ảnh hợp lệ.

### 3.4. Sắp xếp thứ tự trang tự nhiên (Natural Sort)
- Khi tải lên nhiều file hoặc giải nén từ ZIP, thứ tự trang được sắp xếp tự nhiên theo tên file:
  - *Ví dụ đúng:* `1.jpg` $\rightarrow$ `2.jpg` $\rightarrow$ `9.jpg` $\rightarrow$ `10.jpg` $\rightarrow$ `100.jpg`.
  - *Chặn lỗi ASCII:* Không bị nhảy `1.jpg` $\rightarrow$ `10.jpg` $\rightarrow$ `100.jpg` $\rightarrow$ `2.jpg`.
- Thứ tự trang (`page_number`) trong CSDL luôn được đánh số liên tục từ `1` đến `N` không có lỗ hổng.

### 3.5. Kiểm tra trùng lặp (SHA-256) & Lưu trữ an toàn
- Với mỗi ảnh tải lên, hệ thống tự động:
  - Đọc kích thước điểm ảnh: chiều rộng (`width`), chiều cao (`height`).
  - Tính mã băm `file_hash` (chuẩn SHA-256).
  - Nếu phát hiện trong chapter đã có ảnh cùng `file_hash`: **Hệ thống vẫn lưu ảnh bình thường** nhưng đánh dấu cờ `is_duplicate_hash = true` và hiển thị icon cảnh báo tam giác vàng trên giao diện để người dùng tự xem lại và quyết định xoá hay giữ.

### 3.6. Cơ chế thao tác trang ảnh (Thêm, Kéo thả sắp xếp, Xoá)
- **Thêm ảnh mới**: Luôn tự động nối vào cuối danh sách các trang hiện có.
- **Kéo thả hoán đổi vị trí (Reorder)**:
  - Người dùng có thể kéo thả bất kỳ trang nào đến vị trí mong muốn trên giao diện Web.
  - Toàn bộ việc cập nhật lại `page_number` được thực hiện trong **1 Transaction CSDL nguyên tử** (Atomic Transaction) để tránh xung đột khoá duy nhất `UNIQUE(chapter_id, page_number)`.
- **Xoá từng ảnh riêng lẻ**:
  - Xoá file vật lý trên đĩa và bản ghi trong CSDL.
  - Tự động đánh số lại toàn bộ các trang phía sau để đảm bảo chuỗi trang luôn liên tục `1, 2, 3...`.
- **Xoá toàn bộ ảnh của chapter (Clear all pages)**:
  - Cung cấp nút "Xoá tất cả ảnh" kèm hộp thoại xác nhận cảnh báo.
  - Xoá toàn bộ thư mục ảnh của chapter trên đĩa, đưa số trang về `0` và chuyển trạng thái chapter về `draft`.

---

## 4. Cấu trúc CSDL (Database Schema)

### 4.1. Bảng `chapters`
```sql
CREATE TABLE chapters (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    total_pages INTEGER NOT NULL DEFAULT 0,
    storage_dir VARCHAR(500),
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index ràng buộc duy nhất số chapter trong project (chỉ tính chapter chưa xoá)
CREATE UNIQUE INDEX uq_chapters_project_number_active 
ON chapters(project_id, chapter_number) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_chapters_project_status ON chapters(project_id, status);
```

### 4.2. Bảng `chapter_pages`
```sql
CREATE TABLE chapter_pages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    is_duplicate_hash BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chapter_page_number UNIQUE (chapter_id, page_number)
);

CREATE INDEX idx_chapter_pages_lookup ON chapter_pages(chapter_id, page_number);
```

---

## 5. Đặc tả API Endpoints

Tiền tố chung: `/api/v1`. Mọi request yêu cầu Bearer JWT token.

### 5.1. Nhóm API Quản lý Chapter
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/projects/{project_id}/chapters` | Lấy danh sách chapter của project (kèm phân trang, lọc trạng thái, tìm kiếm số chap) |
| `POST` | `/projects/{project_id}/chapters` | Tạo chapter mới (validate trùng số chap, quyền member/owner) |
| `GET` | `/chapters/{id}` | Lấy chi tiết chapter |
| `PATCH` | `/chapters/{id}` | Cập nhật tiêu đề, trạng thái (`ready`/`draft`) |
| `DELETE` | `/chapters/{id}` | Xoá mềm chapter (chỉ owner hoặc admin/root) |

### 5.2. Nhóm API Quản lý Trang ảnh & Upload
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/chapters/{id}/upload-images` | Upload nhiều file ảnh lẻ (Multipart form-data) |
| `POST` | `/chapters/{id}/upload-zip` | Upload 1 file nén ZIP chứa ảnh (Multipart form-data) |
| `GET` | `/chapters/{id}/pages` | Lấy danh sách tất cả các trang ảnh của chapter |
| `PUT` | `/chapters/{id}/pages/reorder` | Sắp xếp lại thứ tự các trang (`{ "page_ids": [12, 10, 11] }`) |
| `DELETE` | `/chapters/{id}/pages/{page_id}` | Xoá 1 trang cụ thể (tự dồn lại các trang sau) |
| `DELETE` | `/chapters/{id}/pages` | Xoá toàn bộ ảnh của chapter (Reset về 0 trang) |
| `GET` | `/chapters/{id}/pages/{page_id}/file` | Xem / Tải file ảnh thực tế (Stream Binary) |

---

## 6. Đặc tả Giao diện Web (`web/`)

### 6.1. Tab "Tập truyện" (Trong trang Chi tiết Dự án `/projects/:id`)
- Nằm cùng cấp với Tab "Cấu hình" và Tab "Thành viên".
- Thanh công cụ: Ô tìm kiếm chapter, bộ lọc trạng thái (`Tất cả`, `Chưa có ảnh`, `Sẵn sàng`, `Đang xử lý`), nút **"+ Thêm Chapter"**.
- Bảng danh sách:
  - Cột 1: Số Chapter (Huy hiệu nổi bật: `Chap 01`, `Chap 02`...).
  - Cột 2: Tiêu đề chapter.
  - Cột 3: Số trang ảnh (`25 trang`).
  - Cột 4: Trạng thái (Draft: xám, Ready: xanh lá, Processing: cam).
  - Cột 5: Ngày tạo & Người tạo.
  - Cột 6: Thao tác (Nút **"Quản lý ảnh"**, nút **"Sửa"**, nút **"Xoá"**).
- Modal tạo Chapter: Nhập số tập và tiêu đề, tự động gợi ý số tập tiếp theo.

### 6.2. Trang Quản lý Trang ảnh Chapter (`/projects/:id/chapters/:chapter_id`)
- **Breadcrumb**: `Dự án` > `[Tên truyện]` > `Chapter [Số]`.
- **Thanh trạng thái đầu trang**:
  - Tiêu đề chapter, tổng số trang, dung lượng tổng.
  - Nút **"Đánh dấu Sẵn sàng"** (chuyển trạng thái sang `ready` để chuẩn bị chạy pipeline).
  - Nút cảnh báo nguy hiểm: **"Xoá tất cả ảnh"** (có popconfirm xác nhận).
- **Khu vực Upload ảnh (Dropzone)**:
  - Hỗ trợ kéo thả nhiều ảnh lẻ hoặc 1 file ZIP.
  - Thanh tiến trình tải lên (Progress Bar %) mượt mà.
- **Lưới xem trước trang ảnh (Gallery Thumbnail Grid)**:
  - Hiển thị ảnh thu nhỏ sắc nét, huy hiệu `Trang 01`, `Trang 02`...
  - Kích thước ảnh px, dung lượng file.
  - Nếu trang bị trùng hash với trang khác: Hiển thị icon tam giác vàng kèm tooltip: *"Ảnh này bị trùng nội dung với Trang X"*.
  - Nút icon phóng to (Modal xem ảnh gốc chất lượng cao).
  - Nút icon thùng rác để xoá từng ảnh riêng lẻ.
  - **Kéo thả sắp xếp (Drag & Drop Reorder)**: Dùng chuột kéo thẻ trang thả sang vị trí khác để đổi thứ tự, giao diện cập nhật ngay lập tức và tự động lưu vị trí mới.

---

## 7. Danh sách công việc triển khai (Tasks)

### 7.1. Backend (`main/`)
- [x] **Migration DB**: Script Alembic `20261027_0004_chapters_and_pages.py` tạo bảng `chapters` và `chapter_pages`.
- [x] **Models & Schemas**:
  - `main/app/models/chapter.py` (`Chapter`, `ChapterPage`).
  - `main/app/schemas/chapter.py` (`ChapterCreate`, `ChapterUpdate`, `ChapterRead`, `ChapterPageRead`, `ChapterReorderRequest`).
- [x] **Repositories**:
  - `ChapterRepository`: CRUD chapter, lọc project, kiểm tra trùng số chap, xoá mềm.
  - `ChapterPageRepository`: Thêm trang hàng loạt, lấy danh sách trang, transaction reorder, xoá 1 trang & dồn số trang, xoá tất cả trang.
- [x] **Services**:
  - `ChapterService`: Nghiệp vụ chapter, áp dụng `ProjectPolicy`.
  - `ImageIngestService`:
    - Giải nén ZIP an toàn (chống zip-bomb, lọc file rác).
    - Natural sort theo tên file.
    - Pillow verify magic bytes, đọc width/height, SHA-256 hash.
    - Lưu file vào ổ cứng server `storage/projects/{p_id}/chapters/{c_id}/pages/`.
- [x] **Controllers**:
  - `chapter_controller.py`: Đăng ký endpoints chapter và upload vào router chính.
- [x] **Kiểm thử tự động (pytest)**:
  - `tests/test_chapters.py` bao phủ tất cả các kịch bản (7/7 tests passed, toàn bộ suite 52/52 tests passed).

### 7.2. Frontend Web (`web/`)
- [x] **API Client & Hooks**:
  - `features/chapters/types.ts`.
  - `features/chapters/api/chapterApi.ts`.
  - `features/chapters/hooks/useChapters.ts`.
- [x] **Components**:
  - `ChapterListTab.tsx`: Tab danh sách chapter trong trang chi tiết Project.
  - `CreateChapterModal.tsx`: Modal tạo/sửa chapter.
  - `ChapterPagesPage.tsx`: Trang quản lý ảnh chapter.
  - `ChapterDropzone.tsx`: Vùng kéo thả upload ảnh/ZIP kèm progress.
  - `PageThumbnailCard.tsx`: Thẻ trang ảnh hiển thị kích thước, cảnh báo trùng hash.
  - Hỗ trợ xem trước ảnh gốc và nút xoá từng trang.
  - Hỗ trợ đổi thứ tự ảnh bằng kéo thả trực quan (HTML5 Drag & Drop).
- [x] **Kiểm tra chất lượng**: Typecheck (`npm run typecheck`) và build production (`npm run build`) 100% sạch sẽ, không lỗi.

---

## 8. Tiêu chí nghiệm thu (Acceptance Criteria)

### 8.1. Kiểm thử tự động Backend (pytest)
| # | Tiêu chí nghiệm thu | Kết quả |
|---|---|---|
| **A1** | Migration Alembic tạo và rollback bảng `chapters`, `chapter_pages` thành công | ✅ Đạt |
| **A2** | Tạo chapter thành công, chặn số âm/thập phân | ✅ Đạt |
| **A3** | Chặn trùng `chapter_number` trong cùng 1 project, trả về lỗi 409 Conflict | ✅ Đạt |
| **A4** | Người không thuộc project bị trả về 404 khi truy cập chapter | ✅ Đạt |
| **A5** | Xoá mềm chapter: ẩn khỏi danh sách, không xoá mất file vật lý | ✅ Đạt |
| **A6** | Upload nhiều ảnh lẻ: Lưu file vào storage, đọc đúng width/height, hash SHA-256, sắp xếp đúng Natural sort | ✅ Đạt |
| **A7** | Chặn file độc hại hoặc đổi đuôi file giả mạo qua Magic Bytes verification | ✅ Đạt |
| **A8** | Upload file ZIP: Giải nén thành công, lọc bỏ `__MACOSX`, `.DS_Store` | ✅ Đạt |
| **A9** | Nếu 2 trang trùng mã băm SHA-256: Vẫn lưu cả 2 và đánh dấu `is_duplicate_hash = true` | ✅ Đạt |
| **A10** | Hoán đổi thứ tự trang (Reorder): Cập nhật thứ tự mới trong 1 transaction nguyên tử | ✅ Đạt |
| **A11** | Xoá 1 trang: File bị xoá, các trang phía sau tự động dồn lại liên tục | ✅ Đạt |
| **A12** | Xoá tất cả trang: Xoá sạch file và bản ghi, đưa total_pages về 0 | ✅ Đạt |

### 8.2. Kiểm tra giao diện Web
| # | Tiêu chí nghiệm thu Web | Kết quả |
|---|---|---|
| **C1** | Tab Chapter trong chi tiết dự án hiển thị danh sách chapter rõ ràng, phân trang, lọc trạng thái | ✅ Đạt |
| **C2** | Modal thêm/sửa chapter hoạt động chuẩn xác, gợi ý số tập tự động | ✅ Đạt |
| **C3** | Vùng kéo thả Dropzone upload ảnh/ZIP có thanh tiến trình % trực quan | ✅ Đạt |
| **C4** | Lưới ảnh hiển thị đầy đủ thumbnail, số trang, kích thước, icon cảnh báo trùng hash | ✅ Đạt |
| **C5** | Kéo thả sắp xếp thứ tự các trang ảnh trực quan và tự động lưu vị trí mới | ✅ Đạt |
| **C6** | Có nút xoá từng ảnh và nút xoá tất cả ảnh hoạt động an toàn | ✅ Đạt |
| **C7** | Typecheck (`npm run typecheck`) và Build (`npm run build`) sạch 100% | ✅ Đạt |

---

## 9. Xác nhận nghiệm thu

- **Người duyệt đặc tả:** Chủ dự án
- **Ngày duyệt:** 2026-10-27
- **Trạng thái:** **✅ ĐÃ HOÀN THÀNH & NGHIỆM THU ĐẠT 100%**
