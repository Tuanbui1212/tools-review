from fastapi import FastAPI

from app import __version__
from app.controllers.router import api_router
from app.core.config import get_settings

# API nhỏ của worker service: health để Main / người vận hành kiểm tra. Swagger: /docs
app = FastAPI(title=get_settings().app_name, version=__version__)
app.include_router(api_router, prefix="/api")
