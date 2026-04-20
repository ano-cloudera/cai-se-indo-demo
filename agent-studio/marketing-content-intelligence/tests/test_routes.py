import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("WORKFLOW_BASE_URL", "http://workflow.local")
os.environ.setdefault("WORKFLOW_API_KEY", "test-key")

from fastapi.testclient import TestClient

from app.main import app


class RoutesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint_returns_runtime_summary(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("workflow_base_url_configured", payload)
        self.assertIn("polling", payload)

    def test_ready_endpoint_returns_configuration_checks(self) -> None:
        response = self.client.get("/ready")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ready")
        self.assertTrue(payload["checks"]["workflow_base_url_configured"])
        self.assertTrue(payload["checks"]["workflow_api_key_configured"])

    @patch("app.api.routes.service.to_api_response")
    @patch("app.api.routes.service.run_full_flow", new_callable=AsyncMock)
    def test_full_run_passes_metadata_to_service(
        self,
        mock_run_full_flow: AsyncMock,
        mock_to_api_response,
    ) -> None:
        mock_run_full_flow.return_value = object()
        mock_to_api_response.return_value = {
            "execution": {
                "api_status": "success",
                "workflow_status": "completed",
                "message": "ok",
                "trace_id": "trace-1",
                "session_id": "session-1",
                "session_directory": "/tmp/session-1",
            },
            "integration": {
                "source": "open_webui",
                "interaction_mode": "hybrid_escalation",
                "correlation_id": "corr-1",
                "workflow_profile": "default",
                "requested_outputs": [],
                "adapter_version": "v1",
            },
            "document_processing": {
                "input_mode": "direct_text",
                "upload_attempted": False,
                "upload_succeeded": False,
                "upload_error": None,
                "local_extraction_used": False,
                "local_extraction_method": None,
                "local_extraction_error": None,
            },
            "content_result": {
                "review_summary": None,
                "research_summary": None,
                "recommendations": [],
                "drafted_content": None,
                "final_review": None,
                "final_response": "done",
                "partial_response": None,
                "is_partial": False,
                "pdf_export_status": "not_available",
                "pdf_file_name": None,
            },
            "diagnostics": {
                "artifact_error": None,
                "raw_event_count": 0,
                "last_known_stage": "unknown",
                "stage_summary": None,
            },
            "raw_events": None,
        }

        response = self.client.post(
            "/workflow/full-run",
            params={
                "user_input": "review this article",
                "context": "marketing",
                "source": "open_webui",
                "interaction_mode": "hybrid_escalation",
                "correlation_id": "corr-1",
            },
        )

        self.assertEqual(response.status_code, 200)

        _, kwargs = mock_run_full_flow.await_args
        metadata = kwargs["metadata"]
        self.assertEqual(kwargs["user_input"], "review this article")
        self.assertEqual(kwargs["context"], "marketing")
        self.assertEqual(metadata.source, "open_webui")
        self.assertEqual(metadata.interaction_mode, "hybrid_escalation")
        self.assertEqual(metadata.correlation_id, "corr-1")
        self.assertEqual(kwargs["execution_options"].workflow_profile, "default")
        self.assertEqual(kwargs["execution_options"].requested_outputs, [])

    @patch("app.api.routes.service.to_api_response")
    @patch("app.api.routes.service.run_full_flow", new_callable=AsyncMock)
    def test_full_run_json_uses_stable_request_body_contract(
        self,
        mock_run_full_flow: AsyncMock,
        mock_to_api_response,
    ) -> None:
        mock_run_full_flow.return_value = object()
        mock_to_api_response.return_value = {
            "execution": {
                "api_status": "success",
                "workflow_status": "completed",
                "message": "ok",
                "trace_id": "trace-2",
                "session_id": "session-2",
                "session_directory": "/tmp/session-2",
            },
            "integration": {
                "source": "open_webui",
                "interaction_mode": "structured_workflow",
                "correlation_id": "corr-2",
                "workflow_profile": "export_ready",
                "requested_outputs": [
                    "review_summary",
                    "recommendations",
                ],
                "adapter_version": "v1",
            },
            "document_processing": {
                "input_mode": "direct_text",
                "upload_attempted": False,
                "upload_succeeded": False,
                "upload_error": None,
                "local_extraction_used": False,
                "local_extraction_method": None,
                "local_extraction_error": None,
            },
            "content_result": {
                "review_summary": None,
                "research_summary": None,
                "recommendations": [],
                "drafted_content": None,
                "final_review": None,
                "final_response": "done",
                "partial_response": None,
                "is_partial": False,
                "pdf_export_status": "not_available",
                "pdf_file_name": None,
            },
            "diagnostics": {
                "artifact_error": None,
                "raw_event_count": 0,
                "last_known_stage": "unknown",
                "stage_summary": None,
            },
            "raw_events": None,
        }

        response = self.client.post(
            "/workflow/full-run/json",
            json={
                "user_input": "generate recommendations",
                "context": "campaign brief",
                "metadata": {
                    "source": "open_webui",
                    "interaction_mode": "structured_workflow",
                    "correlation_id": "corr-2",
                },
                "execution_options": {
                    "workflow_profile": "export_ready",
                    "requested_outputs": [
                        "review_summary",
                        "recommendations",
                    ],
                },
            },
        )

        self.assertEqual(response.status_code, 200)

        _, kwargs = mock_run_full_flow.await_args
        metadata = kwargs["metadata"]
        self.assertEqual(kwargs["user_input"], "generate recommendations")
        self.assertEqual(kwargs["context"], "campaign brief")
        self.assertEqual(metadata.source, "open_webui")
        self.assertEqual(metadata.interaction_mode, "structured_workflow")
        self.assertEqual(metadata.correlation_id, "corr-2")
        self.assertEqual(kwargs["execution_options"].workflow_profile, "export_ready")
        self.assertEqual(
            kwargs["execution_options"].requested_outputs,
            ["review_summary", "recommendations"],
        )


if __name__ == "__main__":
    unittest.main()
