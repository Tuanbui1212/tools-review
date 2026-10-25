from sqlalchemy import text
from sqlalchemy.orm import Session


class SystemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ping(self) -> bool:
        try:
            self.db.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
