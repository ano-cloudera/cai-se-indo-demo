Content Intelligence Workflow Demo Bundle

Project state:
- `PROJECT_STATE.md`

Folder structure:
- agents: TXT files for every agent, including name, role, goal, backstory, and tool attachment
- tools: TXT files describing each tool and its purpose
- parameters: TXT files with tool parameters and workflow task mapping
- demo_article: TXT sample article for demo testing

Recommended flow:
1. Upload the demo article
2. Run review
3. Run research
4. Generate recommendations
5. Draft enhanced article
6. Perform final quality review
7. Export final PDF

API integration notes:
- Preferred structured JSON endpoint for tool callers: `POST /workflow/full-run/json`
- Compatibility endpoint for mixed query plus file upload: `POST /workflow/full-run`
- Formal API contract: `docs/api-contract.md`
- Open WebUI integration guidance: `docs/open-webui-integration-notes.md`
- Guardrails Hub integration notes: `docs/guardrails-hub-integration.md`
- CAI / CML environment parameter guide: `docs/cai-env-parameters.md`
- CAI deployment guide: `docs/cai-deployment-guide.md`

Example JSON payload:
{
  "user_input": "Review and improve this article draft",
  "context": "B2B campaign content",
  "metadata": {
    "source": "open_webui",
    "interaction_mode": "structured_workflow",
    "correlation_id": "chat-001"
  },
  "execution_options": {
    "workflow_profile": "export_ready",
    "requested_outputs": [
      "review_summary",
      "recommendations",
      "drafted_content",
      "pdf_export"
    ]
  }
}
