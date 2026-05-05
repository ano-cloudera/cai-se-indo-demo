from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class PredictorConfigurationError(Exception):
    pass


class PredictorRuntimeError(Exception):
    pass


class XrayPredictor:
    def __init__(self, model_path: str | None = None, confidence_threshold: float | None = None) -> None:
        settings = get_settings()
        self.backend_root = settings.backend_root
        self.project_root = settings.backend_root.parent
        configured_model_path = model_path or settings.xray_model_path
        if configured_model_path:
            candidate_path = Path(configured_model_path).expanduser()
            if not candidate_path.is_absolute():
                candidate_path = self.backend_root / candidate_path
            self.model_path = candidate_path.resolve()
        else:
            self.model_path = None
        self.confidence_threshold = (
            confidence_threshold if confidence_threshold is not None else settings.xray_confidence_threshold
        )
        self._model: Any | None = None
        self._load_error: str | None = None

    def _ensure_ultralytics_import(self) -> type:
        try:
            from ultralytics import YOLO

            return YOLO
        except ImportError:
            local_repo = self.project_root / "references" / "ultralytics"
            if local_repo.exists():
                sys.path.insert(0, str(local_repo))
                try:
                    from ultralytics import YOLO

                    return YOLO
                except ImportError as exc:
                    raise PredictorConfigurationError(
                        "Ultralytics could not be imported from the installed environment or local references/ultralytics clone."
                    ) from exc

            raise PredictorConfigurationError(
                "Ultralytics is not installed and references/ultralytics is not available for import."
            )

    def _get_model(self) -> Any:
        if self._model is not None:
            return self._model

        if self._load_error is not None:
            raise PredictorRuntimeError(self._load_error)

        if self.model_path is None:
            raise PredictorConfigurationError(
                "XRAY_MODEL_PATH is not set. Point it to a YOLO11-compatible weight file before running inference."
            )

        if not self.model_path.exists():
            raise PredictorConfigurationError(
                f"XRAY_MODEL_PATH does not exist: {self.model_path}"
            )

        YOLO = self._ensure_ultralytics_import()

        try:
            self._model = YOLO(str(self.model_path))
        except Exception as exc:
            self._load_error = f"Failed to load YOLO model from {self.model_path}: {exc}"
            raise PredictorRuntimeError(self._load_error) from exc

        return self._model

    def predict(self, image_path: str) -> dict:
        model = self._get_model()

        try:
            results = model.predict(
                source=image_path,
                conf=self.confidence_threshold,
                verbose=False,
            )
        except Exception as exc:
            raise PredictorRuntimeError(f"YOLO inference failed for {image_path}: {exc}") from exc

        if not results:
            return self._build_empty_response(self.model_path.name if self.model_path else "unknown-model")

        result = results[0]
        boxes = getattr(result, "boxes", None)
        names = getattr(result, "names", {}) or {}
        detections: list[dict[str, Any]] = []

        if boxes is not None and boxes.xyxy is not None:
            xyxy_items = boxes.xyxy.tolist()
            conf_items = boxes.conf.tolist() if boxes.conf is not None else []
            cls_items = boxes.cls.tolist() if boxes.cls is not None else []

            for index, bbox in enumerate(xyxy_items):
                confidence = float(conf_items[index]) if index < len(conf_items) else 0.0
                class_id = int(cls_items[index]) if index < len(cls_items) else -1
                if isinstance(names, dict):
                    label = names.get(class_id, str(class_id if class_id >= 0 else "unknown"))
                elif isinstance(names, list) and 0 <= class_id < len(names):
                    label = names[class_id]
                else:
                    label = str(class_id if class_id >= 0 else "unknown")
                detections.append(
                    {
                        "label": str(label),
                        "confidence": confidence,
                        "bbox": [float(value) for value in bbox],
                    }
                )

        if not detections:
            return self._build_empty_response(self.model_path.name if self.model_path else "unknown-model")

        top_detection = max(detections, key=lambda item: item["confidence"])
        label = str(top_detection["label"])
        confidence = float(top_detection["confidence"])

        return {
            "status": "success",
            "finding": label,
            "confidence": confidence,
            "detections": detections,
            "summary": f"Detected {len(detections)} finding(s) in the uploaded X-ray.",
            "explanation": f"Top detection was '{label}' with confidence {confidence:.2f}.",
            "action_items": [
                "Review the detected regions on the annotated image.",
                "Validate the selected model weights against the clinical use case.",
            ],
            "model_info": {
                "name": self.model_path.name,
                "version": "runtime",
                "framework": "ultralytics-yolo11",
                "source": str(self.model_path),
            },
        }

    @staticmethod
    def _build_empty_response(model_name: str) -> dict:
        return {
            "status": "success",
            "finding": "no_finding",
            "confidence": 0.0,
            "detections": [],
            "summary": "No detections were produced by the current model.",
            "explanation": "The model ran successfully but did not return any bounding boxes above the confidence threshold.",
            "action_items": [
                "Review whether the loaded weights are appropriate for chest X-ray detection.",
                "Adjust the confidence threshold if lower-signal detections should be inspected.",
            ],
            "model_info": {
                "name": model_name,
                "version": "runtime",
                "framework": "ultralytics-yolo11",
                "source": model_name,
            },
        }
