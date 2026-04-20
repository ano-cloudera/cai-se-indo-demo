import os
import unittest

os.environ.setdefault("WORKFLOW_BASE_URL", "http://workflow.local")
os.environ.setdefault("WORKFLOW_API_KEY", "test-key")

from app.models.workflow import ArtifactItem, NormalizedWorkflowResult
from app.services.workflow_service import WorkflowService


class StubGuardrailsService:
    def __init__(self) -> None:
        self.responses = {}

    def protect_text(self, text, field_name):
        if field_name in self.responses:
            return self.responses[field_name]
        from app.guardrails.service import GuardrailsResult

        return GuardrailsResult(text=text or "")


class WorkflowServiceApiResponseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.guardrails = StubGuardrailsService()
        self.service = WorkflowService(guardrails_service=self.guardrails)

    def test_to_api_response_includes_integration_metadata_and_pdf_status(self) -> None:
        normalized = NormalizedWorkflowResult(
            session_id="session-123",
            session_directory="/tmp/session-123",
            trace_id="trace-123",
            source="open_webui",
            interaction_mode="hybrid_escalation",
            correlation_id="corr-123",
            workflow_profile="export_ready",
            requested_outputs=["review_summary", "pdf_export"],
            status="completed",
            message="Workflow execution completed",
            review_summary="review text",
            final_response="final answer",
            artifact_files=[
                ArtifactItem(name="result.pdf", path="/tmp/result.pdf"),
            ],
            upload_attempted=True,
            upload_succeeded=True,
        )

        response = self.service.to_api_response(normalized)

        self.assertEqual(response.integration.source, "open_webui")
        self.assertEqual(response.integration.interaction_mode, "hybrid_escalation")
        self.assertEqual(response.integration.correlation_id, "corr-123")
        self.assertEqual(response.integration.workflow_profile, "export_ready")
        self.assertEqual(
            response.integration.requested_outputs,
            ["review_summary", "pdf_export"],
        )
        self.assertEqual(response.execution.workflow_status, "completed")
        self.assertEqual(response.content_result.pdf_export_status, "success")
        self.assertEqual(response.content_result.pdf_file_name, "result.pdf")
        self.assertFalse(response.diagnostics.guardrails_applied)
        self.assertEqual(response.diagnostics.guardrails_issues, [])

    def test_to_api_response_marks_partial_when_only_partial_response_exists(self) -> None:
        normalized = NormalizedWorkflowResult(
            session_id="session-456",
            session_directory="/tmp/session-456",
            trace_id="trace-456",
            status="running",
            message="Workflow execution still running or incomplete",
            raw_events={
                "events": [
                    {
                        "type": "llm_call_completed",
                        "response": "Intermediate planning output",
                    }
                ]
            },
        )

        response = self.service.to_api_response(normalized)

        self.assertTrue(response.content_result.is_partial)
        self.assertEqual(
            response.content_result.partial_response,
            "Intermediate planning output",
        )
        self.assertEqual(response.content_result.final_response, None)

    def test_normalize_result_applies_embedded_guardrails(self) -> None:
        from app.guardrails.service import GuardrailsResult

        self.guardrails.responses["final_response"] = GuardrailsResult(
            text="sanitized final answer",
            applied=True,
            issues=["final_response was adjusted by Guardrails."],
        )
        self.guardrails.responses["drafted_content"] = GuardrailsResult(
            text="sanitized draft",
            applied=True,
            issues=[],
        )

        normalized = self.service._normalize_result(
            session_id="session-1",
            session_directory="/tmp/session-1",
            trace_id="trace-1",
            source="open_webui",
            interaction_mode="structured_workflow",
            correlation_id="corr-1",
            workflow_profile="default",
            requested_outputs=[],
            raw_events={
                "events": [
                    {
                        "type": "crew_kickoff_completed",
                        "output": "unsafe final answer",
                    },
                    {
                        "type": "agent_execution_completed",
                        "output": "drafted_article: unsafe draft",
                    },
                ]
            },
            artifacts=[],
        )

        self.assertEqual(normalized.final_response, "sanitized final answer")
        self.assertEqual(normalized.drafted_content, "sanitized draft")
        self.assertTrue(normalized.guardrails_applied)
        self.assertEqual(
            normalized.guardrails_issues,
            ["final_response was adjusted by Guardrails."],
        )


if __name__ == "__main__":
    unittest.main()
