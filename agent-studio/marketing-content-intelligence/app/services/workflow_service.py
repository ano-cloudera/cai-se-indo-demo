from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.clients.workflow_client import WorkflowClient
from app.core.settings import settings
from app.guardrails import GuardrailsService
from app.models.workflow import (
    ArtifactItem,
    ContentResultInfo,
    CreateSessionResponse,
    DiagnosticsInfo,
    DocumentProcessingInfo,
    ExecutionInfo,
    IntegrationInfo,
    ListArtifactsResponse,
    NormalizedWorkflowResult,
    RequestMetadata,
    UploadFileResponse,
    WorkflowApiResponse,
    WorkflowExecutionOptions,
    WorkflowRunRequest,
    WorkflowRunResponse,
)
from app.services.document_extraction_service import (
    DocumentExtractionError,
    DocumentExtractionService,
)

logger = logging.getLogger(__name__)


class WorkflowService:
    def __init__(
        self,
        client: Optional[WorkflowClient] = None,
        extraction_service: Optional[DocumentExtractionService] = None,
        guardrails_service: Optional[GuardrailsService] = None,
    ) -> None:
        self.client = client or WorkflowClient()
        self.extraction_service = extraction_service or DocumentExtractionService()
        self.guardrails_service = guardrails_service or GuardrailsService()

    async def create_session(self) -> CreateSessionResponse:
        logger.info("[create_session] creating workflow session")
        data = await self.client.create_session()
        logger.info(
            "[create_session] created session_id=%s session_directory=%s",
            data.get("session_id"),
            data.get("session_directory"),
        )
        return CreateSessionResponse(**data)

    async def upload_file(
        self,
        session_id: str,
        file_name: str,
        file_bytes: bytes,
    ) -> UploadFileResponse:
        logger.info(
            "[upload_file] uploading file session_id=%s file_name=%s size_bytes=%s",
            session_id,
            file_name,
            len(file_bytes),
        )
        data = await self.client.upload_file(session_id, file_name, file_bytes)
        logger.info(
            "[upload_file] upload response success=%s file_path=%s",
            data.get("success"),
            data.get("file_path"),
        )
        return UploadFileResponse(**data)

    async def run_workflow(
        self,
        request: WorkflowRunRequest,
        upload_succeeded: bool = False,
        upload_error: Optional[str] = None,
        local_extracted_text: Optional[str] = None,
        local_extraction_method: Optional[str] = None,
    ) -> WorkflowRunResponse:
        user_input = request.user_input

        if request.execution_options.workflow_profile != "default":
            user_input = (
                f"{user_input}\n\n"
                f"Workflow execution profile: {request.execution_options.workflow_profile}.\n"
                f"Adjust prioritization and output sequencing to match this profile."
            )

        if request.execution_options.requested_outputs:
            requested_outputs_text = ", ".join(request.execution_options.requested_outputs)
            user_input = (
                f"{user_input}\n\n"
                f"Requested outputs: {requested_outputs_text}.\n"
                f"Prioritize these outputs in the final structured response when possible."
            )

        if local_extracted_text:
            user_input = (
                f"{user_input}\n\n"
                f"The original uploaded file named {request.uploaded_filename} could not be attached directly to the workflow.\n"
                f"A local document extraction fallback was successfully performed using method: {local_extraction_method}.\n"
                f"You must treat the extracted text below as the source document and continue with the normal review, research, recommendation, drafting, and final review workflow.\n\n"
                f"BEGIN EXTRACTED DOCUMENT TEXT\n"
                f"{local_extracted_text[:15000]}\n"
                f"END EXTRACTED DOCUMENT TEXT"
            )
        elif request.uploaded_filename:
            if upload_succeeded:
                user_input = (
                    f"{user_input}\n\n"
                    f"Uploaded file is available: {request.uploaded_filename}.\n"
                    f"You must treat this as a document-based request.\n"
                    f"Call Document Ingestion Agent first before any editorial review.\n"
                    f"Use the uploaded file named {request.uploaded_filename} as part of the workflow input."
                )
            else:
                user_input = (
                    f"{user_input}\n\n"
                    f"The user attempted to provide a file named {request.uploaded_filename}, "
                    f"but the backend could not confirm that the file is accessible to the workflow.\n"
                    f"Do not assume the file can be read.\n"
                    f"If the content is not present in the conversation, ask User Guidance Agent to request the text content "
                    f"or guide the user to re-upload the file."
                )

        logger.info(
            "[run_workflow] starting workflow session_id=%s uploaded_filename=%s upload_succeeded=%s local_fallback=%s input_preview=%s",
            request.session_id,
            request.uploaded_filename,
            upload_succeeded,
            bool(local_extracted_text),
            user_input[:400].replace("\n", " "),
        )

        if upload_error:
            logger.warning("[run_workflow] upload_error=%s", upload_error)

        data = await self.client.kickoff_workflow(
            user_input=user_input,
            context=request.context,
        )

        logger.info("[run_workflow] workflow started trace_id=%s", data.get("trace_id"))
        return WorkflowRunResponse(**data)

    async def wait_for_workflow(
        self,
        trace_id: str,
    ) -> Any:
        best_events: Any = {"events": []}
        best_count = 0

        logger.info("[wait_for_workflow] begin polling trace_id=%s", trace_id)

        for attempt in range(settings.max_polling_attempts):
            logger.info(
                "[wait_for_workflow] polling attempt=%s/%s trace_id=%s",
                attempt + 1,
                settings.max_polling_attempts,
                trace_id,
            )

            events = await self.client.get_events(trace_id)
            preview = self._events_preview(events)

            logger.info(
                "[wait_for_workflow] received events trace_id=%s preview=%s",
                trace_id,
                preview,
            )

            current_count = self._event_count(events)
            if current_count > 0 and current_count >= best_count:
                best_events = events
                best_count = current_count
                logger.info(
                    "[wait_for_workflow] updated best_events trace_id=%s event_count=%s",
                    trace_id,
                    best_count,
                )

            if self._is_workflow_finished(events):
                logger.info(
                    "[wait_for_workflow] detected final workflow state from current events trace_id=%s",
                    trace_id,
                )
                return events

            if self._is_workflow_finished(best_events):
                logger.info(
                    "[wait_for_workflow] detected final workflow state from best_events trace_id=%s",
                    trace_id,
                )
                return best_events

            await asyncio.sleep(settings.polling_interval_seconds)

        logger.warning(
            "[wait_for_workflow] max polling attempts reached trace_id=%s returning best_events_count=%s",
            trace_id,
            best_count,
        )
        return best_events

    async def list_artifacts(
        self,
        session_id: str,
        session_directory: str,
    ) -> ListArtifactsResponse:
        logger.info(
            "[list_artifacts] listing artifacts session_id=%s session_directory=%s",
            session_id,
            session_directory,
        )

        data = await self.client.list_artifacts(session_id, session_directory)

        raw_files = self._extract_artifact_entries(data)
        artifacts = [
            ArtifactItem(
                name=item.get("name", ""),
                path=item.get("path", ""),
                type=item.get("type"),
                size=item.get("size"),
            )
            for item in raw_files
        ]

        logger.info(
            "[list_artifacts] found artifacts_count=%s session_id=%s",
            len(artifacts),
            session_id,
        )

        return ListArtifactsResponse(
            session_id=session_id,
            session_directory=session_directory,
            artifacts=artifacts,
        )

    async def download_artifact(
        self,
        session_id: str,
        artifact_path: str,
    ) -> bytes:
        logger.info(
            "[download_artifact] downloading artifact session_id=%s artifact_path=%s",
            session_id,
            artifact_path,
        )
        return await self.client.download_artifact(session_id, artifact_path)

    async def download_all_artifacts(
        self,
        session_id: str,
    ) -> bytes:
        logger.info(
            "[download_all_artifacts] downloading all artifacts session_id=%s",
            session_id,
        )
        return await self.client.download_all_artifacts(session_id)

    async def run_full_flow(
        self,
        user_input: str,
        context: str = "",
        uploaded_filename: Optional[str] = None,
        uploaded_file_bytes: Optional[bytes] = None,
        metadata: Optional[RequestMetadata] = None,
        execution_options: Optional[WorkflowExecutionOptions] = None,
    ) -> NormalizedWorkflowResult:
        metadata = metadata or RequestMetadata()
        execution_options = execution_options or WorkflowExecutionOptions()

        logger.info(
            "[run_full_flow] started source=%s interaction_mode=%s correlation_id=%s workflow_profile=%s requested_outputs=%s uploaded_filename=%s has_file=%s",
            metadata.source,
            metadata.interaction_mode,
            metadata.correlation_id,
            execution_options.workflow_profile,
            execution_options.requested_outputs,
            uploaded_filename,
            uploaded_file_bytes is not None,
        )

        session = await self.create_session()

        upload_attempted = uploaded_filename is not None and uploaded_file_bytes is not None
        upload_succeeded = False
        upload_error: Optional[str] = None

        local_extraction_used = False
        local_extraction_method: Optional[str] = None
        local_extraction_error: Optional[str] = None
        local_extracted_text: Optional[str] = None

        if upload_attempted:
            try:
                await self.upload_file(
                    session_id=session.session_id,
                    file_name=uploaded_filename,
                    file_bytes=uploaded_file_bytes,
                )
                upload_succeeded = True
            except Exception as exc:
                upload_error = str(exc)
                logger.warning(
                    "[run_full_flow] upload failed session_id=%s file_name=%s error=%s",
                    session.session_id,
                    uploaded_filename,
                    upload_error,
                )

                try:
                    extracted_text, extraction_method = self.extraction_service.extract_from_bytes(
                        uploaded_filename,
                        uploaded_file_bytes,
                    )
                    local_extraction_used = True
                    local_extraction_method = extraction_method
                    local_extracted_text = extracted_text
                    logger.info(
                        "[run_full_flow] local extraction fallback succeeded file_name=%s method=%s text_length=%s",
                        uploaded_filename,
                        extraction_method,
                        len(extracted_text),
                    )
                except DocumentExtractionError as extraction_exc:
                    local_extraction_error = str(extraction_exc)
                    logger.warning(
                        "[run_full_flow] local extraction fallback failed file_name=%s error=%s",
                        uploaded_filename,
                        local_extraction_error,
                    )

        workflow_response = await self.run_workflow(
            WorkflowRunRequest(
                user_input=user_input,
                context=context,
                session_id=session.session_id,
                uploaded_filename=uploaded_filename,
                metadata=metadata,
                execution_options=execution_options,
            ),
            upload_succeeded=upload_succeeded,
            upload_error=upload_error,
            local_extracted_text=local_extracted_text,
            local_extraction_method=local_extraction_method,
        )

        events = await self.wait_for_workflow(workflow_response.trace_id)

        artifact_files: List[ArtifactItem] = []
        artifact_error: Optional[str] = None

        try:
            artifacts_response = await self.list_artifacts(
                session_id=session.session_id,
                session_directory=session.session_directory,
            )
            artifact_files = artifacts_response.artifacts
        except Exception as exc:
            artifact_error = str(exc)
            logger.warning(
                "[run_full_flow] artifact listing failed session_id=%s error=%s",
                session.session_id,
                artifact_error,
            )

        normalized = self._normalize_result(
            session_id=session.session_id,
            session_directory=session.session_directory,
            trace_id=workflow_response.trace_id,
            source=metadata.source,
            interaction_mode=metadata.interaction_mode,
            correlation_id=metadata.correlation_id,
            workflow_profile=execution_options.workflow_profile,
            requested_outputs=execution_options.requested_outputs,
            raw_events=events,
            artifacts=artifact_files,
            artifact_error=artifact_error,
            upload_attempted=upload_attempted,
            upload_succeeded=upload_succeeded,
            upload_error=upload_error,
            local_extraction_used=local_extraction_used,
            local_extraction_method=local_extraction_method,
            local_extraction_error=local_extraction_error,
        )

        logger.info(
            "[run_full_flow] completed session_id=%s trace_id=%s status=%s upload_attempted=%s upload_succeeded=%s local_extraction_used=%s artifact_count=%s artifact_error=%s",
            normalized.session_id,
            normalized.trace_id,
            normalized.status,
            normalized.upload_attempted,
            normalized.upload_succeeded,
            normalized.local_extraction_used,
            len(normalized.artifact_files or []),
            normalized.artifact_error,
        )

        return normalized

    def _normalize_result(
        self,
        session_id: str,
        session_directory: str,
        trace_id: str,
        source: str,
        interaction_mode: str,
        correlation_id: Optional[str],
        workflow_profile: str,
        requested_outputs: List[str],
        raw_events: Any,
        artifacts: List[ArtifactItem],
        artifact_error: Optional[str] = None,
        upload_attempted: bool = False,
        upload_succeeded: bool = False,
        upload_error: Optional[str] = None,
        local_extraction_used: bool = False,
        local_extraction_method: Optional[str] = None,
        local_extraction_error: Optional[str] = None,
    ) -> NormalizedWorkflowResult:
        status = self._derive_status(raw_events)
        parsed = self._parse_workflow_outputs(raw_events)
        guardrails_issues: List[str] = []
        guardrails_applied = False

        final_response_guard = self.guardrails_service.protect_text(
            parsed.get("final_response"),
            "final_response",
        )
        drafted_content_guard = self.guardrails_service.protect_text(
            parsed.get("drafted_content"),
            "drafted_content",
        )

        parsed["final_response"] = final_response_guard.text or parsed.get("final_response")
        parsed["drafted_content"] = (
            drafted_content_guard.text or parsed.get("drafted_content")
        )

        guardrails_applied = (
            final_response_guard.applied or drafted_content_guard.applied
        )
        guardrails_issues.extend(final_response_guard.issues)
        guardrails_issues.extend(drafted_content_guard.issues)

        if status == "completed":
            message = "Workflow execution completed"
            if artifact_error:
                message = "Workflow execution completed, but artifact listing failed"
        elif status == "failed":
            message = "Workflow execution failed"
        else:
            message = "Workflow execution still running or incomplete"
            if artifact_error:
                message = "Workflow execution still running or incomplete, and artifact listing failed"

        return NormalizedWorkflowResult(
            session_id=session_id,
            session_directory=session_directory,
            trace_id=trace_id,
            source=source,
            interaction_mode=interaction_mode,
            correlation_id=correlation_id,
            workflow_profile=workflow_profile,
            requested_outputs=requested_outputs,
            status=status,
            message=message,
            review_summary=parsed.get("review_summary"),
            research_summary=parsed.get("research_summary"),
            recommendations=parsed.get("recommendations"),
            drafted_content=parsed.get("drafted_content"),
            final_review=parsed.get("final_review"),
            final_response=parsed.get("final_response"),
            artifact_files=artifacts,
            artifact_error=artifact_error,
            upload_attempted=upload_attempted,
            upload_succeeded=upload_succeeded,
            upload_error=upload_error,
            local_extraction_used=local_extraction_used,
            local_extraction_method=local_extraction_method,
            local_extraction_error=local_extraction_error,
            guardrails_applied=guardrails_applied,
            guardrails_issues=guardrails_issues,
            raw_events=raw_events,
        )
    
    def to_api_response(
    self, normalized: NormalizedWorkflowResult,
    ) -> WorkflowApiResponse:
        event_count = self._event_count(normalized.raw_events)
        last_stage = self._detect_last_known_stage(normalized.raw_events)
        stage_summary = self._build_stage_summary(normalized.raw_events, last_stage)

        input_mode = "direct_text"
        if normalized.local_extraction_used:
            input_mode = "local_extraction"
        elif normalized.upload_succeeded:
            input_mode = "workflow_file"

        pdf_export_status = "not_available"
        pdf_file_name = None

        if normalized.artifact_files:
            for item in normalized.artifact_files:
                if item.name.lower().endswith(".pdf"):
                    pdf_export_status = "success"
                    pdf_file_name = item.name
                    break

        if pdf_file_name is None and normalized.artifact_error:
            pdf_export_status = "failed"

        partial_response = self._build_partial_response(normalized.raw_events)
        is_partial = normalized.final_response is None and partial_response is not None

        return WorkflowApiResponse(
            execution=ExecutionInfo(
                api_status="success",
                workflow_status=normalized.status,
                message=normalized.message,
                trace_id=normalized.trace_id,
                session_id=normalized.session_id,
                session_directory=normalized.session_directory,
            ),
            integration=IntegrationInfo(
                source=normalized.source,
                interaction_mode=normalized.interaction_mode,
                correlation_id=normalized.correlation_id,
                workflow_profile=normalized.workflow_profile,
                requested_outputs=normalized.requested_outputs,
            ),
            document_processing=DocumentProcessingInfo(
                input_mode=input_mode,
                upload_attempted=normalized.upload_attempted,
                upload_succeeded=normalized.upload_succeeded,
                upload_error=normalized.upload_error,
                local_extraction_used=normalized.local_extraction_used,
                local_extraction_method=normalized.local_extraction_method,
                local_extraction_error=normalized.local_extraction_error,
            ),
            content_result=ContentResultInfo(
                review_summary=normalized.review_summary,
                research_summary=normalized.research_summary,
                recommendations=normalized.recommendations or [],
                drafted_content=normalized.drafted_content,
                final_review=normalized.final_review,
                final_response=normalized.final_response,
                partial_response=partial_response,
                is_partial=is_partial,
                pdf_export_status=pdf_export_status,
                pdf_file_name=pdf_file_name,
            ),
            diagnostics=DiagnosticsInfo(
                artifact_error=normalized.artifact_error,
                raw_event_count=event_count,
                last_known_stage=last_stage,
                stage_summary=stage_summary,
                guardrails_applied=normalized.guardrails_applied,
                guardrails_issues=normalized.guardrails_issues,
            ),
            raw_events=normalized.raw_events,
        )
    
    @staticmethod
    def _extract_artifact_entries(data: Dict[str, Any]) -> List[Dict[str, Any]]:
        if isinstance(data, dict):
            if "files" in data and isinstance(data["files"], list):
                return data["files"]
            if "artifacts" in data and isinstance(data["artifacts"], list):
                return data["artifacts"]
            if "entries" in data and isinstance(data["entries"], list):
                return data["entries"]
        return []

    @staticmethod
    def _event_count(events: Any) -> int:
        if isinstance(events, dict) and isinstance(events.get("events"), list):
            return len(events["events"])
        return 0

    @staticmethod
    def _events_preview(events: Any) -> str:
        try:
            if isinstance(events, dict) and isinstance(events.get("events"), list):
                event_types = [e.get("type", "unknown") for e in events["events"][-10:]]
                return f"event_count={len(events['events'])} recent_types={event_types}"
            text = str(events)
            return text[:500] + ("...<truncated>" if len(text) > 500 else "")
        except Exception:
            return "<unavailable>"

    @staticmethod
    def _detect_last_known_stage(events: Any) -> str:
        if not isinstance(events, dict):
            return "unknown"

        event_list = events.get("events", [])
        if not isinstance(event_list, list) or not event_list:
            return "unknown"

        text_blob = " ".join(str(e) for e in event_list).lower()

        if "final document export" in text_blob or "export final document" in text_blob:
            return "export"
        if "quality review" in text_blob or "final quality reviewer" in text_blob:
            return "quality_review"
        if "content drafting" in text_blob or "drafting agent" in text_blob:
            return "drafting"
        if "content strategy" in text_blob or "strategy agent" in text_blob:
            return "strategy"
        if "external information research" in text_blob or "external information researcher" in text_blob:
            return "research"
        if "content reviewer" in text_blob or "review" in text_blob:
            return "review"
        if "document ingestion" in text_blob or "document intake" in text_blob:
            return "document_ingestion"
        if "user guidance" in text_blob:
            return "guidance"

        recent_types = [str(e.get("type", "")).lower() for e in event_list[-5:]]
        if "crew_kickoff_completed" in recent_types:
            return "completed"

        return "unknown"

    @staticmethod
    def _build_stage_summary(events: Any, last_stage: str) -> Optional[str]:
        if not isinstance(events, dict):
            return None

        event_list = events.get("events", [])
        if not isinstance(event_list, list) or not event_list:
            return None

        recent_types = [str(event.get("type", "unknown")) for event in event_list[-5:]]
        return (
            f"last_stage={last_stage}; "
            f"event_count={len(event_list)}; "
            f"recent_event_types={recent_types}"
        )

    @staticmethod
    def _derive_status(events: Any) -> str:
        if events is None:
            return "unknown"

        event_list = events.get("events", []) if isinstance(events, dict) else []
        if not isinstance(event_list, list) or not event_list:
            return "running"

        event_types = [str(e.get("type", "")).lower() for e in event_list]

        if "crew_kickoff_failed" in event_types or "task_failed" in event_types:
            return "failed"

        if "crew_kickoff_completed" in event_types:
            return "completed"

        return "running"

    @staticmethod
    def _is_workflow_finished(events: Any) -> bool:
        if events is None:
            return False

        event_list = events.get("events", []) if isinstance(events, dict) else []
        if not isinstance(event_list, list) or not event_list:
            return False

        event_types = [str(e.get("type", "")).lower() for e in event_list]

        return (
            "crew_kickoff_completed" in event_types
            or "crew_kickoff_failed" in event_types
            or "task_failed" in event_types
        )

    @staticmethod
    def _parse_workflow_outputs(events: Any) -> Dict[str, Any]:
        parsed: Dict[str, Any] = {
            "review_summary": None,
            "research_summary": None,
            "recommendations": None,
            "drafted_content": None,
            "final_review": None,
            "final_response": None,
        }

        if not isinstance(events, dict):
            return parsed

        event_list = events.get("events", [])
        if not isinstance(event_list, list):
            return parsed

        agent_outputs: List[str] = []
        final_answers: List[str] = []

        for event in event_list:
            event_type = str(event.get("type", ""))

            if event_type == "agent_execution_completed":
                output = event.get("output")
                if isinstance(output, str) and output.strip():
                    agent_outputs.append(output.strip())

            if event_type == "crew_kickoff_completed":
                output = event.get("output")
                if isinstance(output, str) and output.strip():
                    parsed["final_response"] = output.strip()

            if event_type == "llm_call_completed":
                response = event.get("response")
                if isinstance(response, str) and response.strip():
                    final_answers.append(response.strip())

        for output in agent_outputs:
            lowered = output.lower()

            if parsed["review_summary"] is None and (
                "kelemahan" in lowered
                or "kekuatan" in lowered
                or "improvement_priorities" in lowered
                or "missing_information" in lowered
                or "prioritas perbaikan" in lowered
            ):
                parsed["review_summary"] = output
                continue

            if parsed["research_summary"] is None and (
                "search_findings" in lowered
                or "relevant_context" in lowered
                or "enrichment_opportunities" in lowered
                or "main_topic" in lowered
                or "temuan" in lowered
                or "konteks relevan" in lowered
            ):
                parsed["research_summary"] = output
                continue

            if parsed["recommendations"] is None and (
                "rekomendasi" in lowered
                or "recommendations" in lowered
                or "proposed title" in lowered
                or "angle" in lowered
                or "usulan judul" in lowered
            ):
                parsed["recommendations"] = [{"content": output}]
                continue

            if parsed["drafted_content"] is None and (
                "final_article" in lowered
                or "drafted_article" in lowered
                or "artikel final" in lowered
                or "versi artikel" in lowered
            ):
                parsed["drafted_content"] = output
                continue

            if parsed["final_review"] is None and (
                "ready_to_export" in lowered
                or "final_title" in lowered
                or "final_notes" in lowered
                or "catatan review akhir" in lowered
            ):
                parsed["final_review"] = {"content": output}
                continue

        if parsed["final_response"] is None:
            for response in reversed(final_answers):
                if "Final Answer:" not in response:
                    continue

                candidate = response.split("Final Answer:", 1)[1].strip()
                lowered_candidate = candidate.lower()

                if (
                    lowered_candidate.startswith("thought:")
                    or "\naction:" in lowered_candidate
                    or "\naction input:" in lowered_candidate
                ):
                    continue

                if candidate:
                    parsed["final_response"] = candidate
                    break

        return parsed

    @staticmethod
    def _build_partial_response(events: Any) -> Optional[str]:
        if not isinstance(events, dict):
            return None

        event_list = events.get("events", [])
        if not isinstance(event_list, list):
            return None

        for event in reversed(event_list):
            response = event.get("response")
            if isinstance(response, str) and response.strip():
                return response.strip()

            output = event.get("output")
            if isinstance(output, str) and output.strip():
                return output.strip()

        return None
