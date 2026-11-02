from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    worker_name: str
    services: dict[str, bool]
