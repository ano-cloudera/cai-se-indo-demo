from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=utc_now)


class ResultPreviewContext(BaseModel):
    columns: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    truncated: bool = False
    captured_at: datetime = Field(default_factory=utc_now)


class SessionMemoryState(BaseModel):
    session_id: str
    messages: list[ChatMessage] = Field(default_factory=list)
    last_generated_sql: str | None = None
    last_answer: str | None = None
    last_result_preview: ResultPreviewContext | None = None
    last_intent: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
