import httpx

from app.core.config import get_settings


class MainClient:
    """Gọi API của Main. Sau này dùng để lấy dữ liệu task và báo kết quả (M05)."""

    def __init__(self, base_url: str | None = None, timeout: float = 3.0) -> None:
        self.base_url = base_url or get_settings().main_api_url
        self.timeout = timeout

    def is_reachable(self) -> bool:
        try:
            response = httpx.get(f"{self.base_url}/api/health", timeout=self.timeout)
            return response.status_code == 200
        except httpx.HTTPError:
            return False
