from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import Engine, inspect

from alembic import command
from app.models import Base


def test_a1_migrations_roundtrip_and_match_models(
    db_engine: Engine, alembic_config: Config
) -> None:
    command.downgrade(alembic_config, "base")
    assert not {"users", "refresh_tokens"} & set(inspect(db_engine).get_table_names())

    command.upgrade(alembic_config, "head")
    assert {"users", "refresh_tokens"} <= set(inspect(db_engine).get_table_names())

    with db_engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], f"Migration lệch so với model: {diff}"
