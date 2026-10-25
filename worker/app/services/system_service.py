from app.core.config import get_settings


class SystemService:
    def ping(self) -> dict[str, str]:
        return {"reply": "pong", "worker": get_settings().worker_name}
