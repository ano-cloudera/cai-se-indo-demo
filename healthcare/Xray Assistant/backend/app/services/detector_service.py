from app.schemas.inference import Finding
from app.utils.severity_rules import classify_severity


class DetectorService:
    def detect(self, image_uri: str) -> list[Finding]:
        severity = classify_severity(label="normal", score=0.98)
        return [Finding(label="normal", confidence=0.98, severity=severity)]

