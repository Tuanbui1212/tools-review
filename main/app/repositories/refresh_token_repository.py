from datetime import datetime

from sqlalchemy import select, update

from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    def revoke_all_for_user(
        self, user_id: int, now: datetime, reason: str, client: str | None = None
    ) -> None:
        """client=None: huỷ token ở mọi loại client."""
        stmt = update(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
        )
        if client is not None:
            stmt = stmt.where(RefreshToken.client == client)
        self.db.execute(stmt.values(revoked_at=now, revoked_reason=reason))
