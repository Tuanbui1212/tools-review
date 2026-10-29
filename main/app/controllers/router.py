from fastapi import APIRouter

from app.controllers import (
    auth_controller,
    chapter_controller,
    health_controller,
    invitation_controller,
    project_controller,
    user_controller,
)

# /api/health — không đánh phiên bản.
api_router = APIRouter()
api_router.include_router(health_controller.router)

# /api/v1/... — API nghiệp vụ
v1_router = APIRouter()
v1_router.include_router(auth_controller.router)
v1_router.include_router(user_controller.router)
v1_router.include_router(project_controller.router)
v1_router.include_router(invitation_controller.router)
v1_router.include_router(chapter_controller.router)
