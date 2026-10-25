from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_health_service
from app.schemas.health import HealthResponse
from app.services.health_service import HealthService

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(service: Annotated[HealthService, Depends(get_health_service)]) -> HealthResponse:
    return service.check()
