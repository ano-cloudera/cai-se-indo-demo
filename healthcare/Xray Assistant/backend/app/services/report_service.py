from app.schemas.inference import Finding


class ReportService:
    def build_report(self, findings: list[Finding]) -> str:
        labels = ", ".join(finding.label for finding in findings)
        return f"Preliminary findings: {labels}"

