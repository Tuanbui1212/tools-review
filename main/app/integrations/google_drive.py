import io
import logging
import threading
from pathlib import Path
from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

logger = logging.getLogger(__name__)


class GoogleDriveClient:
    """Client tương tác với Google Drive API v3 thông qua OAuth2 Refresh Token."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        root_folder_id: str | None = None,
        cache_dir: Path | None = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.root_folder_id = root_folder_id

        self.cache_dir = cache_dir or Path("storage/cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()

        self.credentials = Credentials(
            None,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        try:
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
        except Exception as e:
            logger.warning(f"Could not pre-refresh credentials with requests: {e}")

    @property
    def service(self):
        """Trả về service client an toàn độc lập cho từng thread (thread-safe)."""
        if not hasattr(self._local, "service"):
            self._local.service = build("drive", "v3", credentials=self.credentials, cache_discovery=False)
        return self._local.service


    def find_or_create_folder(self, folder_name: str, parent_id: str | None = None) -> str:
        """Tìm hoặc tạo mới một thư mục trên Google Drive."""
        query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        if parent_id:
            query += f" and '{parent_id}' in parents"

        response = (
            self.service.files()
            .list(q=query, spaces="drive", fields="files(id, name)")
            .execute()
        )
        files = response.get("files", [])
        if files:
            return files[0]["id"]

        # Nếu chưa có thì tạo mới
        folder_metadata: dict[str, Any] = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            folder_metadata["parents"] = [parent_id]

        created = (
            self.service.files()
            .create(body=folder_metadata, fields="id")
            .execute()
        )
        logger.info(f"Đã tạo thư mục Google Drive: {folder_name} (ID: {created['id']})")
        return created["id"]

    def get_or_create_chapter_folder(self, project_id: int, chapter_number: int) -> str:
        """Lấy hoặc tạo cây thư mục chuẩn: ComicReviewTool / Project_{id} / Chapter_{number}."""
        base_parent = self.root_folder_id
        if not base_parent:
            base_parent = self.find_or_create_folder("ComicReviewTool_5TB")

        p_folder = self.find_or_create_folder(f"Project_{project_id}", parent_id=base_parent)
        c_folder = self.find_or_create_folder(f"Chapter_{chapter_number}", parent_id=p_folder)
        return c_folder

    def upload_file(
        self,
        content: bytes,
        filename: str,
        mime_type: str,
        parent_folder_id: str,
    ) -> dict[str, Any]:
        """Tải file lên Google Drive và ghi vào local cache đệm."""
        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=True)
        file_metadata = {
            "name": filename,
            "parents": [parent_folder_id],
        }

        created = (
            self.service.files()
            .create(body=file_metadata, media_body=media, fields="id, name, size")
            .execute()
        )
        file_id = created["id"]

        # Ghi vào cache đệm local để lần xem sau tức thì không tốn quota API
        cache_path = self.cache_dir / f"{file_id}.bin"
        try:
            with open(cache_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.warning(f"Không thể ghi cache local cho file {file_id}: {e}")

        logger.info(f"Đã upload Google Drive thành công: {filename} (ID: {file_id})")
        return created

    def download_file(self, file_id: str) -> bytes:
        """Tải file từ cache nếu có; nếu chưa có thì tải từ Google Drive và nạp cache."""
        cache_path = self.cache_dir / f"{file_id}.bin"
        if cache_path.exists() and cache_path.stat().st_size > 0:
            with open(cache_path, "rb") as f:
                return f.read()

        # Tải từ Google Drive
        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        content = fh.getvalue()

        # Lưu lại vào cache
        try:
            with open(cache_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.warning(f"Không thể lưu cache sau khi tải {file_id}: {e}")

        return content

    def delete_file(self, file_id: str) -> None:
        """Xoá file trên Google Drive và xoá bản cache local."""
        try:
            self.service.files().delete(fileId=file_id).execute()
            logger.info(f"Đã xoá file Google Drive: {file_id}")
        except Exception as e:
            logger.error(f"Lỗi khi xoá file Google Drive {file_id}: {e}")

        # Xoá cache local
        cache_path = self.cache_dir / f"{file_id}.bin"
        if cache_path.exists():
            try:
                cache_path.unlink()
            except Exception:
                pass

    def move_to_trash(self, file_id: str) -> None:
        """Chuyển file hoặc folder vào Thùng rác Google Drive (Google sẽ tự xoá sau 30 ngày)."""
        try:
            self.service.files().update(fileId=file_id, body={"trashed": True}).execute()
            logger.info(f"Đã chuyển vào Thùng rác Google Drive: {file_id}")
        except Exception as e:
            logger.error(f"Lỗi khi chuyển vào Thùng rác Google Drive {file_id}: {e}")

        # Xoá cache local nếu có
        cache_path = self.cache_dir / f"{file_id}.bin"
        if cache_path.exists():
            try:
                cache_path.unlink()
            except Exception:
                pass

    def rename_folder(self, folder_id: str, new_name: str) -> None:
        """Đổi tên thư mục trên Google Drive."""
        try:
            self.service.files().update(fileId=folder_id, body={"name": new_name}).execute()
            logger.info(f"Đã đổi tên folder Google Drive {folder_id} -> {new_name}")
        except Exception as e:
            logger.error(f"Lỗi khi đổi tên folder Google Drive {folder_id}: {e}")
            raise


