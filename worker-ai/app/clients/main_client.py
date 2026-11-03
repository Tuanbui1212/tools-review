from typing import Any

import httpx

from app.core.config import get_settings


class MainClient:
    """Gọi API của Main để lấy dữ liệu task, tải ảnh, cập nhật tiến độ và lưu panels."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or get_settings().main_api_url).rstrip("/")
        self.timeout = timeout

    def is_reachable(self) -> bool:
        try:
            response = httpx.get(f"{self.base_url}/api/health", timeout=3.0)
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    def update_task_progress(
        self,
        task_id: str,
        progress: int,
        stage_message: str,
        *,
        status: str = "processing",
        result: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> bool:
        """Worker gọi báo % tiến độ thời gian thực về cho Main."""
        url = f"{self.base_url}/api/v1/internal/tasks/{task_id}/progress"
        payload = {
            "progress": max(0, min(100, progress)),
            "stage_message": stage_message,
            "status": status,
            "result": result,
            "error_message": error_message,
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.patch(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            # Ghi log nhưng không ngắt quãng tiến trình xử lý
            print(f"[MainClient] Lỗi khi cập nhật progress: {e}")
            return False

    def get_chapter_pages(self, chapter_id: int) -> list[dict[str, Any]]:
        """Lấy danh sách các trang ảnh của chapter."""
        url = f"{self.base_url}/api/v1/internal/chapters/{chapter_id}/pages"
        with httpx.Client(timeout=self.timeout) as client:
            res = client.get(url)
            res.raise_for_status()
            return res.json()

    def download_page_file(self, chapter_id: int, page_id: int) -> bytes:
        """Tải nội dung nhị phân của trang ảnh từ Main."""
        url = f"{self.base_url}/api/v1/chapters/{chapter_id}/pages/{page_id}/file"
        with httpx.Client(timeout=self.timeout) as client:
            res = client.get(url)
            res.raise_for_status()
            return res.content

    def save_panels_batch(self, chapter_id: int, panels: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Lưu toàn bộ danh sách panel đã bóc tách lên Main."""
        url = f"{self.base_url}/api/v1/internal/chapters/{chapter_id}/panels/batch"
        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(url, json=panels)
            res.raise_for_status()
            return res.json()
