from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Comic Review Main"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://crt:crt@localhost:5432/crt"
    redis_url: str = "redis://localhost:6379/0"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "crt-minio"
    s3_secret_key: str = "crt-minio-secret"
    s3_bucket: str = "crt-files"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    jwt_secret: str = DEV_JWT_SECRET
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    login_max_failed: int = 5
    login_lock_minutes: int = 15

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> "Settings":
        if self.environment == "production" and self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError("JWT_SECRET phải được đặt khi ENVIRONMENT=production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
