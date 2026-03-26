from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.services.answer_prompt_builder import build_answer_messages
from app.services.chat_router import is_indonesian_text
from app.services.llm_client import AzureOpenAIClient


class AnswerGeneratorService:
    def __init__(
        self,
        llm_client: AzureOpenAIClient | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.llm_client = llm_client

    def _get_llm_client(self) -> AzureOpenAIClient:
        if self.llm_client is None:
            self.llm_client = AzureOpenAIClient(self.settings)
        return self.llm_client

    def generate_answer(
        self,
        original_question: str,
        executed_sql: str,
        columns: list[str],
        rows: list[dict[str, Any]],
        row_count: int,
        truncated: bool,
        limit_applied: bool,
    ) -> str:
        if not rows:
            if is_indonesian_text(original_question):
                return "Tidak ada data yang cocok untuk pertanyaan ini pada hasil saat ini."
            return "No matching records were found for this request in the current data."

        messages = build_answer_messages(
            original_question=original_question,
            executed_sql=executed_sql,
            columns=columns,
            rows=rows,
            row_count=row_count,
            truncated=truncated,
            limit_applied=limit_applied,
        )
        answer = self._get_llm_client().chat(messages=messages, temperature=0.2)

        if truncated and "preview" not in answer.lower():
            suffix = (
                " Hanya preview data yang ditampilkan di sini."
                if is_indonesian_text(original_question)
                else " Only a preview of the matching records is shown here."
            )
            answer = f"{answer}{suffix}"

        return answer.strip()
