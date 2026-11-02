from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Comic Review Worker"
    worker_name: str = "worker-1"

    # Redis là broker do Main quản lý; worker chỉ kết nối tới.
    redis_url: str = "redis://localhost:6379/0"
    # Worker không truy cập DB của Main; mọi dữ liệu đi qua API của Main (D045).
    main_api_url: str = "http://localhost:8000"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "crt-minio"
    s3_secret_key: str = "crt-minio-secret"
    s3_bucket: str = "crt-files"


@lru_cache
def get_settings() -> Settings:
    return Settings()
