from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from importlib import import_module
from typing import List, Optional

from app.core.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class GuardrailsResult:
    text: str
    applied: bool = False
    issues: List[str] = field(default_factory=list)


class GuardrailsService:
    def __init__(self) -> None:
        self.enabled = settings.guardrails_enabled
        self._guard = None
        self._initialization_error: Optional[str] = None

        if not self.enabled:
            return

        self._configure_token()
        self._initialize_guard()

    def protect_text(self, text: Optional[str], field_name: str) -> GuardrailsResult:
        if text is None or not text.strip():
            return GuardrailsResult(text=text or "")

        if not self.enabled:
            return GuardrailsResult(text=text)

        if self._guard is None:
            issues = []
            if self._initialization_error:
                issues.append(self._initialization_error)
            return GuardrailsResult(text=text, applied=False, issues=issues)

        try:
            outcome = self._guard.validate(text)
            validated_output = getattr(outcome, "validated_output", None)
            if isinstance(validated_output, str) and validated_output.strip():
                issues: List[str] = []
                if validated_output != text:
                    issues.append(f"{field_name} was adjusted by Guardrails.")
                return GuardrailsResult(text=validated_output, applied=True, issues=issues)

            if isinstance(outcome, str):
                return GuardrailsResult(text=outcome, applied=True)

            return GuardrailsResult(text=text, applied=True)
        except Exception as exc:
            logger.warning(
                "[guardrails] validation failed field_name=%s error=%s",
                field_name,
                exc,
            )
            return GuardrailsResult(
                text=text,
                applied=False,
                issues=[f"Guardrails validation failed for {field_name}: {exc}"],
            )

    def _configure_token(self) -> None:
        if settings.guardrails_hub_token:
            os.environ.setdefault("GUARDRAILS_HUB_TOKEN", settings.guardrails_hub_token)

    def _initialize_guard(self) -> None:
        try:
            guardrails_module = import_module("guardrails")
            hub_module = import_module("guardrails.hub")

            Guard = getattr(guardrails_module, "Guard")
            GuardrailsPII = getattr(hub_module, "GuardrailsPII")
            ToxicLanguage = getattr(hub_module, "ToxicLanguage")

            guard = Guard()

            if settings.guardrails_pii_enabled:
                pii_entities = [
                    item.strip()
                    for item in settings.guardrails_pii_entities.split(",")
                    if item.strip()
                ]
                if pii_entities:
                    guard = guard.use(
                        GuardrailsPII(entities=pii_entities, on_fail="fix")
                    )

            if settings.guardrails_toxic_language_enabled:
                guard = guard.use(
                    ToxicLanguage(
                        threshold=settings.guardrails_toxic_language_threshold,
                        validation_method="sentence",
                        on_fail="filter",
                    )
                )

            self._guard = guard
            logger.info("[guardrails] initialized embedded Guardrails validators")
        except Exception as exc:
            self._initialization_error = (
                "Guardrails is enabled but validators are not ready. "
                "Install Hub validators and configure the Guardrails token. "
                f"Details: {exc}"
            )
            logger.warning("[guardrails] initialization skipped error=%s", exc)
