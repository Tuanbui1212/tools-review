import pytest
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker

from app import cli
from app.models.user import User


@pytest.fixture
def cli_db(db_session: Session, db_engine: Engine, monkeypatch: pytest.MonkeyPatch) -> Session:
    monkeypatch.setattr(cli, "SessionLocal", sessionmaker(bind=db_engine, expire_on_commit=False))
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt="": "password123")
    return db_session


def test_a2_create_admin_once(cli_db: Session) -> None:
    argv = ["create-admin", "--username", "Boss", "--email", "Boss@Example.com"]

    assert cli.main(argv) == 0
    assert cli.main(argv) == 1

    admins = cli_db.scalars(select(User).where(User.system_role == "admin")).all()
    assert [(u.username, u.email) for u in admins] == [("boss", "boss@example.com")]


def test_create_admin_rejects_short_password(
    cli_db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt="": "short")

    assert cli.main(["create-admin", "--username", "boss", "--email", "b@example.com"]) == 1
    assert cli_db.scalars(select(User)).all() == []
