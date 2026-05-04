from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import Settings, get_settings
from app.services.bedrock_service import BedrockService, BedrockServiceError


class GenAIService:
    def __init__(self, settings: Settings | None = None, bedrock_service: BedrockService | None = None) -> None:
        self.settings = settings or get_settings()
        self.bedrock_service = bedrock_service or BedrockService(self.settings)

    def generate_clinical_response(self, detection_payload: dict[str, Any]) -> dict[str, Any]:
        fallback = self._fallback_response(detection_payload)
        provider = (self.settings.genai_provider or "").strip().lower()

        if provider != "bedrock":
            return fallback

        try:
            prompt = self._build_prompt(detection_payload)
            raw_text = self.bedrock_service.generate_json_text(prompt)
            return self._normalize_response(self._parse_response(raw_text), fallback)
        except BedrockServiceError:
            return fallback
        except Exception:
            return fallback

    def _build_prompt(self, detection_payload: dict[str, Any]) -> str:
        compact_payload = {
            "finding": detection_payload.get("finding", "unknown"),
            "confidence": round(float(detection_payload.get("confidence", 0.0)), 4),
            "severity": detection_payload.get("severity", "unknown"),
            "detections": [
                {
                    "label": item.get("label", "unknown"),
                    "confidence": round(float(item.get("confidence", 0.0)), 4),
                    "bbox": item.get("bbox", []),
                }
                for item in detection_payload.get("detections", [])
            ],
        }

        return (
            "You are assisting with chest X-ray review support for a healthcare demo.\n"
            "Use only the structured detection data provided below.\n"
            "Do not present a definitive diagnosis. Do not overclaim certainty.\n"
            "Use careful wording such as 'suggests', 'may require review', and 'should be correlated clinically'.\n"
            "Return strict JSON only with keys: summary, explanation, action_items.\n"
            "Requirements:\n"
            "- summary: one concise sentence for assistive clinical review support\n"
            "- explanation: one concise plain-language sentence grounded in the detection data\n"
            "- action_items: exactly 3 short recommended next actions\n"
            "- Keep the response professional, concise, and suitable for a demo\n"
            "- No markdown, no preamble, no extra keys\n\n"
            f"Detection payload:\n{json.dumps(compact_payload, ensure_ascii=True)}"
        )

    def _parse_response(self, raw_text: str) -> dict[str, Any]:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

        return {}

    def _normalize_response(self, parsed: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
        summary = str(parsed.get("summary", "")).strip()
        explanation = str(parsed.get("explanation", "")).strip()
        action_items_raw = parsed.get("action_items")

        action_items: list[str] = []
        if isinstance(action_items_raw, list):
            action_items = [str(item).strip() for item in action_items_raw if str(item).strip()]
        elif isinstance(action_items_raw, str):
            action_items = [item.strip(" -•\t") for item in action_items_raw.splitlines() if item.strip()]

        if not summary:
            summary = fallback["summary"]
        if not explanation:
            explanation = fallback["explanation"]

        if len(action_items) < 3:
            action_items.extend(fallback["action_items"][len(action_items):])
        action_items = action_items[:3]

        return {
            "summary": summary,
            "explanation": explanation,
            "action_items": action_items,
        }

    def _fallback_response(self, detection_payload: dict[str, Any]) -> dict[str, Any]:
        finding = str(detection_payload.get("finding", "")).strip().lower()
        if finding == "no_finding":
            return {
                "summary": "No high-confidence abnormal detection was produced. Clinical review may still be appropriate in context.",
                "explanation": "The current detection output did not surface a bounding box above the configured threshold, so the image should be interpreted with appropriate clinical correlation.",
                "action_items": [
                    "Review the image in the full clinical context",
                    "Correlate the result with symptoms and vital signs",
                    "Compare with prior imaging if available",
                ],
            }

        return {
            "summary": "Potential abnormal finding detected. Clinical review is recommended.",
            "explanation": "The model identified a finding that should be reviewed in the appropriate clinical context.",
            "action_items": [
                "Review the image with a radiologist",
                "Correlate the finding with symptoms and vital signs",
                "Compare with prior imaging if available",
            ],
        }
