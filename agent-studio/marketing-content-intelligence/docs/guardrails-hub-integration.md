# Guardrails Hub Integration

## Goal

Use Guardrails AI Hub as an embedded Python validation layer inside `marketing-content-intelligence`.

This is the preferred current integration path.

## Why Embedded

This approach avoids:

- an extra HTTP hop
- another always-on CAI application in the critical path
- unnecessary orchestration complexity before Ray is actually needed

## Primary Integration Point

- `app/guardrails/service.py`

Current usage:

- sanitize `final_response`
- sanitize `drafted_content`
- expose Guardrails diagnostics via `WorkflowApiResponse.diagnostics`

## Required Setup

1. install core package:

```bash
pip install guardrails-ai
```

2. configure Hub token:

```bash
guardrails configure --token <your_guardrails_hub_token>
```

3. install validators:

```bash
guardrails hub install hub://guardrails/guardrails_pii
guardrails hub install hub://guardrails/toxic_language
```

## Environment Variables

- `GUARDRAILS_ENABLED=true`
- `GUARDRAILS_HUB_TOKEN=<token>`
- `GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD=0.5`
- `GUARDRAILS_PII_ENTITIES=EMAIL_ADDRESS,PHONE_NUMBER,PERSON`

## Current Default Behavior

If Guardrails is disabled:

- workflow execution runs normally
- no validation is applied

If Guardrails is enabled but validators are missing:

- workflow execution still runs normally
- diagnostics capture Guardrails initialization issues

## Future Extensions

- add input validation before Qwen requests
- add output validation in `cai-qwen-serving`
- add brand-policy validators from Guardrails Hub
- promote to standalone worker only if operationally necessary
