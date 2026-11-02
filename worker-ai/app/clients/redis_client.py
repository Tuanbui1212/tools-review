import redis

from app.core.config import get_settings


def ping_redis() -> bool:
    try:
        client = redis.Redis.from_url(get_settings().redis_url, socket_connect_timeout=2)
        return bool(client.ping())
    except redis.RedisError:
        return False
