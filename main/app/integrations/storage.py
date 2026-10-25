import logging
from functools import lru_cache

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_s3_client() -> BaseClient:
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=Config(connect_timeout=2, read_timeout=5, retries={"total_max_attempts": 1}),
    )


def bucket_exists() -> bool:
    try:
        get_s3_client().head_bucket(Bucket=get_settings().s3_bucket)
        return True
    except (BotoCoreError, ClientError):
        return False


def ensure_bucket() -> None:
    """Tạo bucket chứa file dùng chung nếu chưa có (D038)."""
    bucket = get_settings().s3_bucket
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)
        logger.info("Created bucket %s", bucket)
    except BotoCoreError:
        logger.warning("Storage unavailable, skip creating bucket %s", bucket)
