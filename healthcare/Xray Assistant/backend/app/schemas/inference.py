from pydantic import BaseModel, Field


class DetectionItem(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: list[float] = Field(default_factory=list)


class ModelInfo(BaseModel):
    name: str
    version: str
    framework: str
    source: str


class InferenceResponse(BaseModel):
    case_id: str
    status: str
    finding: str
    confidence: float = Field(ge=0.0, le=1.0)
    severity: str
    detections: list[DetectionItem] = Field(default_factory=list)
    summary: str
    explanation: str
    action_items: list[str] = Field(default_factory=list)
    annotated_image_path: str | None = None
    model_info: ModelInfo
