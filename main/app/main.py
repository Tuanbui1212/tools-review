import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.controllers.router import api_router, v1_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.integrations.storage import ensure_bucket
from app.schemas.common import ErrorResponse

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    ensure_bucket()
    yield


settings = get_settings()

# Swagger UI: /docs, ReDoc: /redoc (D037)
app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(api_router, prefix="/api")
app.include_router(v1_router, prefix="/api/v1")
