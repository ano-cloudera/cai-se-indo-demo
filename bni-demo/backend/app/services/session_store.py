from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import RLock

from app.core.config import Settings, get_settings
from app.schemas.session import SessionMemoryState


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class InMemorySessionStore:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._sessions: dict[str, SessionMemoryState] = {}
        self._lock = RLock()

    def create_session_if_not_exists(self, session_id: str) -> SessionMemoryState:
        with self._lock:
            self.delete_expired_sessions()
            session = self._sessions.get(session_id)
            if session is None:
                session = SessionMemoryState(session_id=session_id)
                self._sessions[session_id] = session
            else:
                session.updated_at = utc_now()
            return session.model_copy(deep=True)

    def get_session(self, session_id: str) -> SessionMemoryState | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if self.is_expired(session):
                del self._sessions[session_id]
                return None
            session.updated_at = utc_now()
            return session.model_copy(deep=True)

    def update_session(self, session: SessionMemoryState) -> SessionMemoryState:
        with self._lock:
            session.updated_at = utc_now()
            self._sessions[session.session_id] = session.model_copy(deep=True)
            return self._sessions[session.session_id].model_copy(deep=True)

    def delete_expired_sessions(self) -> int:
        with self._lock:
            expired_ids = [
                session_id
                for session_id, session in self._sessions.items()
                if self.is_expired(session)
            ]
            for session_id in expired_ids:
                del self._sessions[session_id]
            return len(expired_ids)

    def is_expired(self, session: SessionMemoryState) -> bool:
        ttl = timedelta(minutes=self.settings.session_ttl_minutes)
        return utc_now() - session.updated_at > ttl

    def touch_session(self, session_id: str) -> SessionMemoryState | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if self.is_expired(session):
                del self._sessions[session_id]
                return None
            session.updated_at = utc_now()
            return session.model_copy(deep=True)
