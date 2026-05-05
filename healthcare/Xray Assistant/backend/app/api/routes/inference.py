from pathlib import Path
from shutil import copyfileobj
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.schemas.inference import DetectionItem, InferenceResponse, ModelInfo
from app.services.genai_service import GenAIService
from ml.inference.postprocess import confidence_to_severity
from ml.inference.predictor import PredictorConfigurationError, PredictorRuntimeError, XrayPredictor
from ml.inference.visualize import generate_annotated_image


router = APIRouter(tags=["inference"])
predictor = XrayPredictor()
genai_service = GenAIService()
settings = get_settings()

BACKEND_ROOT = settings.backend_root
UPLOADS_DIR = BACKEND_ROOT / "temp" / "uploads"
ANNOTATED_DIR = BACKEND_ROOT / "temp" / "annotated"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)


def to_public_temp_url(file_path: str | None) -> str | None:
    if not file_path:
        return None

    path = Path(file_path).resolve()
    try:
        relative = path.relative_to(BACKEND_ROOT / "temp")
    except ValueError:
        return file_path

    return f"/temp/{relative.as_posix()}"


@router.post("/v1/infer", response_model=InferenceResponse)
async def run_inference(
    file: UploadFile = File(...),
    response_language: str = Form("en"),
) -> InferenceResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must include a filename.",
        )

    case_id = str(uuid4())
    suffix = Path(file.filename).suffix.lower() or ".bin"
    upload_path = UPLOADS_DIR / f"{case_id}{suffix}"

    try:
        with upload_path.open("wb") as buffer:
            copyfileobj(file.file, buffer)
    finally:
        await file.close()

    try:
        prediction = predictor.predict(str(upload_path))
    except PredictorConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except PredictorRuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    confidence = float(prediction["confidence"])
    severity = confidence_to_severity(confidence)
    annotated_image_path = generate_annotated_image(
        image_path=str(upload_path),
        detections=prediction["detections"],
        output_dir=str(ANNOTATED_DIR),
    )

    detections = [
        DetectionItem(
            label=item["label"],
            confidence=float(item["confidence"]),
            bbox=[float(value) for value in item.get("bbox", [])],
        )
        for item in prediction["detections"]
    ]

    detection_payload = {
        "finding": prediction["finding"],
        "confidence": confidence,
        "severity": severity,
        "detections": prediction["detections"],
    }
    enrichment = genai_service.generate_clinical_response(
        detection_payload,
        response_language=response_language,
    )

    return InferenceResponse(
        case_id=case_id,
        status=prediction["status"],
        finding=prediction["finding"],
        confidence=confidence,
        severity=severity,
        detections=detections,
        summary=enrichment["summary"],
        explanation=enrichment["explanation"],
        action_items=list(enrichment.get("action_items", [])),
        annotated_image_path=to_public_temp_url(annotated_image_path),
        model_info=ModelInfo(**prediction["model_info"]),
    )
