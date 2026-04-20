from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx

from app.core.settings import settings


class WorkflowApiError(Exception):
    pass


class WorkflowClient:
    def __init__(self) -> None:
        self.base_url = settings.workflow_base_url.rstrip("/")
        self.api_key = settings.workflow_api_key
        self.timeout = settings.workflow_timeout_seconds

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
        }

    @staticmethod
    def _raise_for_status(response: httpx.Response, message: str) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            details: Optional[str]
            try:
                details = response.text
            except Exception:
                details = None
            raise WorkflowApiError(
                f"{message}. Status={response.status_code}. Details={details}"
            ) from exc

    @staticmethod
    def _path_candidates(path: str) -> List[str]:
        candidates: List[str] = []

        if not path:
            return candidates

        candidates.append(path)

        if "deployable_workflows" in path:
            candidates.append(path.replace("deployable_workflows", "workflows"))

        if path.startswith("/"):
            candidates.append(path.lstrip("/"))
        else:
            candidates.append("/" + path)

        if "deployable_workflows" in path:
            alt = path.replace("deployable_workflows", "workflows")
            if alt.startswith("/"):
                candidates.append(alt.lstrip("/"))
            else:
                candidates.append("/" + alt)

        # remove duplicates while preserving order
        deduped: List[str] = []
        seen = set()
        for item in candidates:
            if item and item not in seen:
                deduped.append(item)
                seen.add(item)
        return deduped

    async def create_session(self) -> Dict[str, Any]:
        url = f"{self.base_url}/api/workflow/createSession"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers={
                    **self._headers(),
                    "Content-Type": "application/json",
                },
                json={},
            )
        self._raise_for_status(response, "Failed to create session")
        return response.json()

    async def kickoff_workflow(
        self,
        user_input: str,
        context: str = "",
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/workflow/kickoff"
        payload = {
            "inputs": {
                "user_input": user_input,
                "context": context,
            }
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers={
                    **self._headers(),
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        self._raise_for_status(response, "Failed to start workflow execution")
        return response.json()

    async def get_events(self, trace_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/workflow/events"
        params = {"trace_id": trace_id}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                url,
                headers={
                    **self._headers(),
                    "Accept": "application/json",
                },
                params=params,
            )
        self._raise_for_status(response, "Failed to get workflow events")
        return response.json()

    async def upload_file(
        self,
        session_id: str,
        file_name: str,
        file_bytes: bytes,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/file/upload"
        params = {"session_id": session_id}

        files = {
            "file": (file_name, file_bytes, "application/octet-stream"),
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers=self._headers(),
                params=params,
                files=files,
            )

        self._raise_for_status(response, "Failed to upload file")
        return response.json()

    async def list_artifacts(
        self,
        session_id: str,
        session_directory: str,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/file/listDirectory"
        errors: List[str] = []

        for candidate in self._path_candidates(session_directory):
            params = {
                "session_id": session_id,
                "path": candidate,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    url,
                    headers=self._headers(),
                    params=params,
                )

            if response.status_code < 400:
                return response.json()

            errors.append(f"path={candidate} status={response.status_code} details={response.text}")

        raise WorkflowApiError(
            "Failed to list artifacts with all candidate paths. " + " | ".join(errors)
        )

    async def download_artifact(
        self,
        session_id: str,
        artifact_path: str,
    ) -> bytes:
        url = f"{self.base_url}/api/file/download"
        errors: List[str] = []

        for candidate in self._path_candidates(artifact_path):
            params = {
                "session_id": session_id,
                "path": candidate,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    url,
                    headers=self._headers(),
                    params=params,
                )

            if response.status_code < 400:
                return response.content

            errors.append(f"path={candidate} status={response.status_code} details={response.text}")

        raise WorkflowApiError(
            "Failed to download artifact with all candidate paths. " + " | ".join(errors)
        )

    async def download_all_artifacts(
        self,
        session_id: str,
    ) -> bytes:
        url = f"{self.base_url}/api/file/downloadAll"
        params = {"session_id": session_id}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                url,
                headers=self._headers(),
                params=params,
            )

        self._raise_for_status(response, "Failed to download all artifacts")
        return response.content