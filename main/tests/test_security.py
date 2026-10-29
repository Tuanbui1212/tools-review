from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import Settings, get_settings
from app.core.errors import UnauthorizedError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secret-pass")
    assert hashed != "secret-pass"
    assert verify_password("secret-pass", hashed)
    assert not verify_password("other-pass", hashed)
    assert not verify_password("secret-pass", "not-a-hash")


def test_access_token_roundtrip() -> None:
    claims = decode_access_token(create_access_token(42, "sub", "app", 3))
    assert (claims.user_id, claims.client, claims.session_version) == (42, "app", 3)


def test_expired_access_token_rejected() -> None:
    long_ago = datetime.now(UTC) - timedelta(hours=1)
    with pytest.raises(UnauthorizedError):
        decode_access_token(create_access_token(42, "sub", "web", 0, now=long_ago))


def test_token_signed_with_other_secret_rejected() -> None:
    forged = jwt.encode(
        {
            "sub": "1",
            "cl": "web",
            "sv": 0,
            "type": "access",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        "another-secret-that-is-long-enough-1234",
        algorithm="HS256",
    )
    with pytest.raises(UnauthorizedError):
        decode_access_token(forged)


def test_token_hash_is_stable_and_not_plain() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != "abc"


def test_production_requires_jwt_secret() -> None:
    with pytest.raises(ValueError):
        Settings(environment="production")
    assert Settings(environment="production", jwt_secret="x" * 40).jwt_secret == "x" * 40
    assert get_settings().jwt_secret
