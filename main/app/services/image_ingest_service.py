import hashlib
import io
import os
import re
import shutil
import zipfile
from pathlib import Path
from typing import BinaryIO

from PIL import Image

from app.core.config import get_settings
from app.models.chapter import Chapter, ChapterPage

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_ZIP_SIZE_BYTES = 300 * 1024 * 1024  # 300 MB
MAX_UNCOMPRESSED_SIZE_BYTES = 1024 * 1024 * 1024  # 1 GB
MAX_PAGES_PER_CHAPTER = 300


def natural_sort_key(s: str) -> list[int | str]:
    """Tách số và chữ để sắp xếp tên file tự nhiên (1.jpg < 2.jpg < 10.jpg)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r"(\d+)", s)]


class ImageIngestService:
    def __init__(self, base_storage_dir: str | None = None) -> None:
        self.base_dir = Path(base_storage_dir or get_settings().storage_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def get_chapter_storage_dir(self, project_id: int, chapter_id: int) -> Path:
        p = self.base_dir / "projects" / str(project_id) / "chapters" / str(chapter_id) / "pages"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def validate_and_inspect_image(self, content: bytes, filename: str) -> tuple[int, int, str, str]:
        """Xác thực magic bytes và lấy thông số ảnh (width, height, mime_type, hash)."""
        if len(content) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(f"File {filename} vượt quá dung lượng tối đa 20MB")

        if len(content) == 0:
            raise ValueError(f"File {filename} rỗng (0 bytes)")

        try:
            with Image.open(io.BytesIO(content)) as img:
                img_format = img.format
                width, height = img.size
        except Exception as e:
            raise ValueError(f"File {filename} không phải là file ảnh hợp lệ: {e}") from e

        if img_format not in ALLOWED_PIL_FORMATS:
            raise ValueError(f"Định dạng ảnh {img_format} của {filename} không được hỗ trợ")

        mime_map = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
        mime_type = mime_map.get(img_format, "image/jpeg")

        file_hash = hashlib.sha256(content).hexdigest()
        return width, height, mime_type, file_hash

    def process_raw_images(
        self,
        chapter: Chapter,
        raw_files: list[tuple[str, bytes]],  # list of (filename, bytes)
        current_max_page: int,
        existing_hashes: set[str],
    ) -> list[ChapterPage]:
        """Xử lý danh sách các file ảnh tải lên trực tiếp."""
        if len(raw_files) + chapter.total_pages > MAX_PAGES_PER_CHAPTER:
            raise ValueError(f"Chapter không thể vượt quá {MAX_PAGES_PER_CHAPTER} trang")

        # Sắp xếp tự nhiên theo tên file
        raw_files.sort(key=lambda x: natural_sort_key(x[0]))

        target_dir = self.get_chapter_storage_dir(chapter.project_id, chapter.id)
        chapter.storage_dir = str(target_dir)

        new_pages: list[ChapterPage] = []
        page_idx = current_max_page + 1

        for original_filename, content in raw_files:
            width, height, mime_type, file_hash = self.validate_and_inspect_image(
                content, original_filename
            )

            is_duplicate = file_hash in existing_hashes
            existing_hashes.add(file_hash)

            ext = Path(original_filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                ext = ".jpg" if mime_type == "image/jpeg" else ".png"

            saved_filename = f"page_{page_idx:04d}_{file_hash[:8]}{ext}"
            file_dest = target_dir / saved_filename

            with open(file_dest, "wb") as f:
                f.write(content)

            page = ChapterPage(
                chapter_id=chapter.id,
                page_number=page_idx,
                original_filename=original_filename,
                file_path=str(file_dest),
                file_size_bytes=len(content),
                width=width,
                height=height,
                mime_type=mime_type,
                file_hash=file_hash,
                is_duplicate_hash=is_duplicate,
            )
            new_pages.append(page)
            page_idx += 1

        return new_pages

    def process_zip_file(
        self,
        chapter: Chapter,
        zip_content: bytes,
        current_max_page: int,
        existing_hashes: set[str],
    ) -> list[ChapterPage]:
        """Giải nén an toàn file ZIP và xử lý các trang ảnh bên trong."""
        if len(zip_content) > MAX_ZIP_SIZE_BYTES:
            raise ValueError("File ZIP vượt quá dung lượng tối đa 300MB")

        try:
            zip_buffer = io.BytesIO(zip_content)
            with zipfile.ZipFile(zip_buffer, "r") as zf:
                # Kiểm tra Zip-bomb
                total_uncompressed = sum(info.file_size for info in zf.infolist())
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise ValueError("Tệp ZIP giải nén vượt quá 1GB (nghi vấn Zip-bomb)")

                if len(zip_content) > 0 and (total_uncompressed / len(zip_content)) > 100:
                    raise ValueError("Tỉ lệ nén ZIP bất thường (>100x, từ chối an toàn)")

                # Lọc file ảnh
                valid_entries: list[tuple[str, bytes]] = []
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    fname = info.filename
                    # Bỏ qua file rác hệ điều hành
                    if (
                        fname.startswith("__MACOSX/")
                        or fname.startswith(".")
                        or "/." in fname
                        or fname.endswith(".DS_Store")
                        or fname.endswith("Thumbs.db")
                    ):
                        continue

                    ext = Path(fname).suffix.lower()
                    if ext in ALLOWED_EXTENSIONS:
                        content = zf.read(info)
                        base_name = Path(fname).name
                        valid_entries.append((base_name, content))
        except zipfile.BadZipFile as e:
            raise ValueError(f"Tệp không phải là định dạng ZIP hợp lệ: {e}") from e

        if not valid_entries:
            raise ValueError("Không tìm thấy file ảnh hợp lệ (.jpg, .png, .webp) trong file ZIP")

        return self.process_raw_images(
            chapter, valid_entries, current_max_page, existing_hashes
        )

    def delete_file(self, file_path: str) -> None:
        """Xoá 1 file vật lý."""
        try:
            p = Path(file_path)
            if p.exists() and p.is_file():
                p.unlink()
        except Exception:
            pass

    def delete_chapter_storage(self, project_id: int, chapter_id: int) -> None:
        """Xoá toàn bộ thư mục lưu trữ của chapter."""
        try:
            target_dir = self.base_dir / "projects" / str(project_id) / "chapters" / str(chapter_id)
            if target_dir.exists() and target_dir.is_dir():
                shutil.rmtree(target_dir)
        except Exception:
            pass
