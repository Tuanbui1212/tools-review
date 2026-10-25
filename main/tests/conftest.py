"""Hạ tầng test.

Test cần DB chạy trên PostgreSQL thật, database riêng `crt_test` (tự tạo nếu chưa có).
Đổi địa chỉ bằng biến TEST_DATABASE_URL. Không kết nối được thì các test cần DB được bỏ qua.
"""

import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from alembic import command
from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.user import User

MAIN_DIR = Path(__file__).resolve().parents[1]
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://crt:crt@localhost:5432/crt_test"
)
DEFAULT_PASSWORD = "password123"


def _ensure_database(url: URL) -> None:
    admin = create_engine(
        url.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
        connect_args={"connect_timeout": 3},
    )
    try:
        with admin.connect() as conn:
            exists = conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database}
            )
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def alembic_config() -> Config:
    config = Config(str(MAIN_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(MAIN_DIR / "alembic"))
    config.set_main_option(
        "sqlalchemy.url", make_url(TEST_DATABASE_URL).render_as_string(hide_password=False)
    )
    return config


@pytest.fixture(scope="session")
def db_engine(alembic_config: Config) -> Iterator[Engine]:
    url = make_url(TEST_DATABASE_URL)
    try:
        _ensure_database(url)
    except OperationalError:
        pytest.skip(f"Không kết nối được PostgreSQL test ({url.host}:{url.port})")
    command.upgrade(alembic_config, "head")
    engine = create_engine(url)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    with db_engine.begin() as conn:
        conn.execute(text("TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE"))
    with Session(db_engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session: Session) -> Callable[..., User]:
    def _make(
        username: str,
        role: str = "sub",
        *,
        password: str = DEFAULT_PASSWORD,
        status: str = "active",
    ) -> User:
        user = User(
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password(password),
            system_role=role,
            status=status,
            failed_login_count=0,
            session_version=0,
        )
        db_session.add(user)
        db_session.commit()
        return user

    return _make


@pytest.fixture
def login(client: TestClient) -> Callable[..., dict]:
    def _login(identifier: str, password: str = DEFAULT_PASSWORD) -> dict:
        response = client.post(
            "/api/v1/auth/login", json={"identifier": identifier, "password": password}
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _login


def auth(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}
