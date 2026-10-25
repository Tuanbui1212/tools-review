from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base


class BaseRepository[ModelT: Base]:
    """Truy cập DB cho một model. Repository không commit; service quyết định transaction."""

    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id_: int) -> ModelT | None:
        return self.db.get(self.model, id_)

    def list(self, *, offset: int = 0, limit: int = 50) -> Sequence[ModelT]:
        return self.db.scalars(select(self.model).offset(offset).limit(limit)).all()

    def add(self, entity: ModelT) -> ModelT:
        self.db.add(entity)
        self.db.flush()
        return entity

    def delete(self, entity: ModelT) -> None:
        self.db.delete(entity)
