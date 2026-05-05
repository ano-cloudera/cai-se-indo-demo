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

    def generate_clinical_response(
        self,
        detection_payload: dict[str, Any],
        response_language: str | None = None,
    ) -> dict[str, Any]:
        language = self._normalize_language(response_language or self.settings.xray_response_language)
        fallback = self._fallback_response(detection_payload, language)
        provider = (self.settings.genai_provider or "").strip().lower()

        if provider != "bedrock":
            return fallback

        try:
            prompt = self._build_prompt(detection_payload, language)
            raw_text = self.bedrock_service.generate_json_text(prompt)
            return self._normalize_response(self._parse_response(raw_text), fallback)
        except BedrockServiceError:
            return fallback
        except Exception:
            return fallback

    def _build_prompt(self, detection_payload: dict[str, Any], language: str) -> str:
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

        if language == "id":
            return (
                "Anda adalah dokter spesialis radiologi yang menulis catatan interpretasi singkat untuk demo healthcare.\n"
                "Gunakan hanya data deteksi terstruktur yang diberikan di bawah ini.\n"
                "Jangan menyampaikan diagnosis definitif. Jangan melebihkan tingkat kepastian.\n"
                "Gunakan bahasa yang hati-hati seperti 'mengarah ke', 'dapat berkaitan dengan', 'mungkin memerlukan review', dan 'perlu dikorelasikan secara klinis'.\n"
                "Balas dalam Bahasa Indonesia.\n"
                "Kembalikan JSON ketat hanya dengan key: summary, explanation, action_items.\n"
                "Ketentuan:\n"
                "- summary: satu kalimat singkat seperti ringkasan awal review radiologi\n"
                "- explanation: satu sampai dua kalimat singkat, terdengar seperti penjelasan dokter spesialis radiologi, tetap mudah dipahami, dan tetap terikat pada data deteksi\n"
                "- action_items: tepat 3 rekomendasi tindak lanjut yang singkat dan praktis\n"
                "- Nada profesional, tenang, aman, dan cocok untuk demo klinis\n"
                "- Tanpa markdown, tanpa pembuka, tanpa key tambahan\n\n"
                f"Detection payload:\n{json.dumps(compact_payload, ensure_ascii=True)}"
            )

        return (
            "You are a radiology specialist drafting a short interpretation note for a healthcare demo.\n"
            "Use only the structured detection data provided below.\n"
            "Do not present a definitive diagnosis. Do not overclaim certainty.\n"
            "Use careful wording such as 'suggests', 'may be associated with', 'may require review', and 'should be correlated clinically'.\n"
            "Return strict JSON only with keys: summary, explanation, action_items.\n"
            "Requirements:\n"
            "- summary: one concise sentence written like an initial radiology review impression\n"
            "- explanation: one or two concise sentences that sound like a specialist interpretation while staying grounded in the detection data\n"
            "- action_items: exactly 3 short recommended next actions\n"
            "- Keep the response professional, calm, safe, and suitable for a demo\n"
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

    def _fallback_response(self, detection_payload: dict[str, Any], language: str) -> dict[str, Any]:
        finding = str(detection_payload.get("finding", "")).strip().lower()
        if language == "id":
            if finding == "no_finding":
                return {
                    "summary": "Tidak tampak temuan abnormal dengan keyakinan tinggi pada hasil deteksi saat ini, namun review klinis tetap diperlukan sesuai konteks.",
                    "explanation": "Deteksi terstruktur saat ini belum menampilkan area yang menonjol di atas ambang yang ditetapkan, sehingga interpretasi akhir tetap perlu dikorelasikan dengan kondisi klinis pasien.",
                    "action_items": [
                        "Tinjau citra dalam konteks klinis lengkap",
                        "Korelasikan hasil dengan gejala dan tanda vital",
                        "Bandingkan dengan pencitraan sebelumnya bila tersedia",
                    ],
                }
            return {
                "summary": "Terdapat temuan potensial pada hasil deteksi yang memerlukan review klinis lebih lanjut.",
                "explanation": "Hasil analisa mengarah ke suatu temuan yang tetap perlu ditinjau sebagai bagian dari interpretasi klinis dan radiologis yang menyeluruh.",
                "action_items": [
                    "Tinjau citra bersama radiolog",
                    "Korelasikan temuan dengan gejala dan tanda vital",
                    "Bandingkan dengan pencitraan sebelumnya bila tersedia",
                ],
            }

        if finding == "no_finding":
            return {
                "summary": "No high-confidence abnormal detection was surfaced in the current result, although clinical review may still be appropriate in context.",
                "explanation": "The structured detection output did not highlight a dominant region above the configured threshold, so the image should still be interpreted with appropriate clinical correlation.",
                "action_items": [
                    "Review the image in the full clinical context",
                    "Correlate the result with symptoms and vital signs",
                    "Compare with prior imaging if available",
                ],
            }

        return {
            "summary": "A potential finding was surfaced in the current review output and should be assessed in the appropriate clinical context.",
            "explanation": "The analysis suggests a finding that warrants specialist review and correlation with the broader clinical picture.",
            "action_items": [
                "Review the image with a radiologist",
                "Correlate the finding with symptoms and vital signs",
                "Compare with prior imaging if available",
            ],
        }

    @staticmethod
    def _normalize_language(language: str | None) -> str:
        value = (language or "en").strip().lower()
        if value in {"id", "indonesia", "bahasa", "bahasa_indonesia"}:
            return "id"
        return "en"
