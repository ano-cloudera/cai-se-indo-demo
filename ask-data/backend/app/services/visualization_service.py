from __future__ import annotations

import re
from typing import Any

from app.schemas.sql import VisualizationSpec


TEMPORAL_COLUMN_MARKERS = ("date", "month", "year", "week", "day", "period")
PIE_COLUMN_MARKERS = ("segment", "collectibility", "category", "product", "status")


def _is_numeric(value: Any) -> bool:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return True
    if isinstance(value, str):
        try:
            float(value.replace(",", ""))
            return True
        except ValueError:
            return False
    return False


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", ""))
        except ValueError:
            return None
    return None


def _to_label(value: Any) -> str:
    if value is None:
        return "Unknown"
    text = str(value).strip()
    return text or "Unknown"


def _looks_temporal(name: str, sample: str) -> bool:
    lowered = name.lower()
    if any(marker in lowered for marker in TEMPORAL_COLUMN_MARKERS):
        return True
    return bool(re.search(r"\d{4}-\d{2}(-\d{2})?", sample))


class VisualizationService:
    def build_visualization(
        self,
        question: str,
        columns: list[str],
        rows: list[dict[str, Any]],
    ) -> VisualizationSpec | None:
        if len(columns) < 2 or len(rows) < 2:
            return None

        x_key = columns[0]
        numeric_columns = [column for column in columns[1:] if any(_is_numeric(row.get(column)) for row in rows)]
        if not numeric_columns:
            return None

        y_key = numeric_columns[0]
        series = [
            {x_key: _to_label(row.get(x_key)), y_key: _to_number(row.get(y_key))}
            for row in rows
            if _to_number(row.get(y_key)) is not None
        ][:8]

        if len(series) < 2:
            return None

        sample_label = str(series[0][x_key])
        chart_type = "line" if _looks_temporal(x_key, sample_label) else "bar"
        lowered_question = question.lower()
        lowered_x = x_key.lower()
        if chart_type == "bar" and len(series) <= 5 and any(marker in lowered_question or marker in lowered_x for marker in PIE_COLUMN_MARKERS):
            chart_type = "pie"

        return VisualizationSpec(
            type=chart_type,
            title=f"{x_key.replace('_', ' ').title()} by {y_key.replace('_', ' ').title()}",
            x_key=x_key,
            y_key=y_key,
            series=series,
        )
