# Implementation Plan

## Product
Content Intelligence Platform on Cloudera AI

## Objective
Build an MVP integration layer that connects Open WebUI to a deployed Agent Studio workflow through a FastAPI adapter.

## MVP Scope
The MVP will support:
1. Create workflow session
2. Upload input file to workflow artifact directory
3. Start workflow execution
4. Poll workflow events
5. List workflow artifacts
6. Download generated artifacts
7. Return normalized response for frontend consumption

## Architecture Mapping

### Frontend Layer
- Open WebUI
- Responsibility:
  - user interaction
  - file upload
  - request submission
  - result display
  - artifact download trigger

### Integration Layer
- FastAPI Adapter
- Responsibility:
  - authenticate to workflow API
  - create session
  - upload files
  - start workflow execution
  - poll events
  - list and download artifacts
  - normalize backend responses for frontend use

### Orchestration Layer
- Agent Studio Workflow
- Responsibility:
  - content review
  - research
  - recommendation
  - drafting
  - final review
  - PDF export

### Inference Layer
- CAI Inference
- Responsibility:
  - model endpoint management
  - abstract model access

### Serving Layer
- Ray Serve
- Responsibility:
  - scalable serving architecture

- vLLM
- Responsibility:
  - efficient LLM serving runtime

### Validation Layer
- Guardrails
- Responsibility:
  - structured output validation
  - final response policy checks

## Backend Components

### app/api
FastAPI route definitions

### app/core
Settings, environment config, constants

### app/clients
Low-level client for Agent Studio workflow APIs

### app/services
Business logic for session, upload, execution, polling, and artifact handling

### app/models
Pydantic request and response models

### app/utils
Helper utilities

## MVP API Endpoints

### POST /sessions
Create workflow session

### POST /sessions/{session_id}/files
Upload file into workflow session artifact directory

### POST /workflow/run
Start workflow execution

### GET /workflow/{trace_id}/events
Get workflow events

### GET /sessions/{session_id}/artifacts
List artifacts

### GET /sessions/{session_id}/artifacts/download
Download one artifact

### GET /sessions/{session_id}/artifacts/download-all
Download all artifacts as ZIP

## First Build Priority
1. settings and config
2. workflow API client
3. session endpoints
4. upload endpoint
5. workflow run endpoint
6. events endpoint
7. artifact endpoints

## Out of Scope for MVP
- auth/login UI
- multi-user tenancy
- database persistence
- CMS publishing integration
- approval workflow
- analytics dashboard
- Guardrails full implementation
- Ray/vLLM deployment work