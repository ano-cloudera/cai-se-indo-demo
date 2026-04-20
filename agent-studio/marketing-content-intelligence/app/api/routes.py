from __future__ import annotations

from io import BytesIO
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.clients.workflow_client import WorkflowApiError
from app.core.settings import settings
from app.models.workflow import (
    CreateSessionResponse,
    ListArtifactsResponse,
    RequestMetadata,
    UploadFileResponse,
    WorkflowApiResponse,
    WorkflowExecutionOptions,
    WorkflowFullRunRequest,
    WorkflowRunRequest,
    WorkflowRunResponse,
)
from app.services.workflow_service import WorkflowService

router = APIRouter()
service = WorkflowService()


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
        "workflow_base_url_configured": bool(settings.workflow_base_url),
        "polling": {
            "interval_seconds": settings.polling_interval_seconds,
            "max_attempts": settings.max_polling_attempts,
        },
    }


@router.get("/ready")
async def readiness_check() -> dict:
    return {
        "status": "ready",
        "service": settings.app_name,
        "checks": {
            "workflow_base_url_configured": bool(settings.workflow_base_url),
            "workflow_api_key_configured": bool(settings.workflow_api_key),
        },
    }


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session():
    try:
        return await service.create_session()
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/sessions/{session_id}/files", response_model=UploadFileResponse)
async def upload_file(session_id: str, file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        return await service.upload_file(
            session_id=session_id,
            file_name=file.filename,
            file_bytes=file_bytes,
        )
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/workflow/run", response_model=WorkflowRunResponse)
async def run_workflow(request: WorkflowRunRequest):
    try:
        return await service.run_workflow(request)
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/workflow/{trace_id}/events")
async def get_workflow_events(trace_id: str):
    try:
        return await service.wait_for_workflow(trace_id)
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/sessions/{session_id}/artifacts", response_model=ListArtifactsResponse)
async def list_artifacts(
    session_id: str,
    session_directory: str = Query(...),
):
    try:
        return await service.list_artifacts(session_id, session_directory)
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/sessions/{session_id}/artifacts/download")
async def download_artifact(
    session_id: str,
    artifact_path: str = Query(...),
):
    try:
        content = await service.download_artifact(session_id, artifact_path)
        filename = artifact_path.split("/")[-1] if "/" in artifact_path else artifact_path
        return StreamingResponse(
            BytesIO(content),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/sessions/{session_id}/artifacts/download-all")
async def download_all_artifacts(session_id: str):
    try:
        content = await service.download_all_artifacts(session_id)
        return StreamingResponse(
            BytesIO(content),
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="artifacts.zip"'},
        )
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/workflow/full-run", response_model=WorkflowApiResponse)
async def full_run(
    user_input: str = Query(...),
    context: str = Query(""),
    source: str = Query("direct_api"),
    interaction_mode: str = Query("structured_workflow"),
    correlation_id: Optional[str] = Query(default=None),
    workflow_profile: str = Query("default"),
    requested_outputs: str = Query(
        default="",
        description="Comma-separated requested outputs such as review_summary,recommendations,drafted_content",
    ),
    file: Optional[UploadFile] = File(default=None),
) -> WorkflowApiResponse:
    try:
        uploaded_filename: Optional[str] = None
        uploaded_file_bytes: Optional[bytes] = None
        parsed_requested_outputs = [
            item.strip()
            for item in requested_outputs.split(",")
            if item.strip()
        ]

        if file is not None:
            uploaded_filename = file.filename
            uploaded_file_bytes = await file.read()

        normalized = await service.run_full_flow(
            user_input=user_input,
            context=context,
            uploaded_filename=uploaded_filename,
            uploaded_file_bytes=uploaded_file_bytes,
            metadata=RequestMetadata(
                source=source,
                interaction_mode=interaction_mode,
                correlation_id=correlation_id,
            ),
            execution_options=WorkflowExecutionOptions(
                workflow_profile=workflow_profile,
                requested_outputs=parsed_requested_outputs,
            ),
        )

        return service.to_api_response(normalized)
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/workflow/full-run/json", response_model=WorkflowApiResponse)
async def full_run_json(request: WorkflowFullRunRequest) -> WorkflowApiResponse:
    try:
        normalized = await service.run_full_flow(
            user_input=request.user_input,
            context=request.context,
            metadata=request.metadata,
            execution_options=request.execution_options,
        )
        return service.to_api_response(normalized)
    except WorkflowApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
