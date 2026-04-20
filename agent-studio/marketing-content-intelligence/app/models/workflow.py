from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RequestMetadata(BaseModel):
    source: str = Field(
        default="direct_api",
        description="Caller source, for example open_webui, direct_api, or downstream_app",
    )
    interaction_mode: str = Field(
        default="structured_workflow",
        description="Interaction mode, for example structured_workflow or hybrid_escalation",
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation identifier for tracing across services",
    )


class WorkflowExecutionOptions(BaseModel):
    workflow_profile: str = Field(
        default="default",
        description="High-level workflow profile such as default, review_only, drafting, or export_ready",
    )
    requested_outputs: List[str] = Field(
        default_factory=list,
        description="Optional list of desired outputs such as review_summary, recommendations, drafted_content, or pdf_export",
    )


class CreateSessionResponse(BaseModel):
    session_id: str
    session_directory: str


class UploadFileResponse(BaseModel):
    success: bool
    message: str
    file_path: str


class WorkflowRunRequest(BaseModel):
    user_input: str = Field(..., description="Natural language input for the workflow")
    context: str = Field(default="", description="Optional context string")
    session_id: Optional[str] = Field(default=None, description="Optional workflow session ID")
    uploaded_filename: Optional[str] = Field(
        default=None,
        description="Optional uploaded filename to be referenced in user_input",
    )
    metadata: RequestMetadata = Field(
        default_factory=RequestMetadata,
        description="Optional integration metadata from the caller",
    )
    execution_options: WorkflowExecutionOptions = Field(
        default_factory=WorkflowExecutionOptions,
        description="Optional execution controls for workflow behavior",
    )


class WorkflowFullRunRequest(BaseModel):
    user_input: str = Field(
        ...,
        description="Natural language request to be processed by the workflow adapter",
    )
    context: str = Field(
        default="",
        description="Optional structured or free-form context for the workflow",
    )
    metadata: RequestMetadata = Field(
        default_factory=RequestMetadata,
        description="Optional integration metadata from the caller",
    )
    execution_options: WorkflowExecutionOptions = Field(
        default_factory=WorkflowExecutionOptions,
        description="Optional execution controls for workflow behavior",
    )


class WorkflowRunResponse(BaseModel):
    trace_id: str


class WorkflowEventsResponse(BaseModel):
    trace_id: str
    events: Any


class ArtifactItem(BaseModel):
    name: str
    path: str
    type: Optional[str] = None
    size: Optional[int] = None


class ListArtifactsResponse(BaseModel):
    session_id: str
    session_directory: str
    artifacts: List[ArtifactItem]


class DownloadArtifactRequest(BaseModel):
    session_id: str
    artifact_path: str


class DownloadAllArtifactsRequest(BaseModel):
    session_id: str


class NormalizedWorkflowResult(BaseModel):
    session_id: Optional[str] = None
    session_directory: Optional[str] = None
    trace_id: Optional[str] = None
    source: str = "direct_api"
    interaction_mode: str = "structured_workflow"
    correlation_id: Optional[str] = None
    workflow_profile: str = "default"
    requested_outputs: List[str] = Field(default_factory=list)
    status: str = "unknown"
    message: Optional[str] = None
    review_summary: Optional[str] = None
    research_summary: Optional[str] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    drafted_content: Optional[str] = None
    final_review: Optional[Dict[str, Any]] = None
    artifact_files: Optional[List[ArtifactItem]] = None
    artifact_error: Optional[str] = None
    upload_attempted: bool = False
    upload_succeeded: bool = False
    upload_error: Optional[str] = None
    local_extraction_used: bool = False
    local_extraction_method: Optional[str] = None
    local_extraction_error: Optional[str] = None
    guardrails_applied: bool = False
    guardrails_issues: List[str] = Field(default_factory=list)
    final_response: Optional[str] = None
    raw_events: Optional[Any] = None


class ExecutionInfo(BaseModel):
    api_status: str = "success"
    workflow_status: str = "unknown"
    message: Optional[str] = None
    trace_id: Optional[str] = None
    session_id: Optional[str] = None
    session_directory: Optional[str] = None


class IntegrationInfo(BaseModel):
    source: str = "direct_api"
    interaction_mode: str = "structured_workflow"
    correlation_id: Optional[str] = None
    workflow_profile: str = "default"
    requested_outputs: List[str] = Field(default_factory=list)
    adapter_version: str = "v1"


class DocumentProcessingInfo(BaseModel):
    input_mode: str = "unknown"
    upload_attempted: bool = False
    upload_succeeded: bool = False
    upload_error: Optional[str] = None
    local_extraction_used: bool = False
    local_extraction_method: Optional[str] = None
    local_extraction_error: Optional[str] = None


class ContentResultInfo(BaseModel):
    review_summary: Optional[str] = None
    research_summary: Optional[str] = None
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    drafted_content: Optional[str] = None
    final_review: Optional[Dict[str, Any]] = None
    final_response: Optional[str] = None
    partial_response: Optional[str] = None
    is_partial: bool = False
    pdf_export_status: str = "not_available"
    pdf_file_name: Optional[str] = None


class DiagnosticsInfo(BaseModel):
    artifact_error: Optional[str] = None
    raw_event_count: int = 0
    last_known_stage: str = "unknown"
    stage_summary: Optional[str] = None
    guardrails_applied: bool = False
    guardrails_issues: List[str] = Field(default_factory=list)


class WorkflowApiResponse(BaseModel):
    execution: ExecutionInfo
    integration: IntegrationInfo
    document_processing: DocumentProcessingInfo
    content_result: ContentResultInfo
    diagnostics: DiagnosticsInfo
    raw_events: Optional[Any] = None
