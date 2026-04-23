# Ask Data — Project State (Latest)

## Document Purpose

This document captures the full working understanding of the Ask Data project up to the latest successful state.
It is intended as a handoff/reference so work can be resumed in a new session without re-deriving context.

This version supersedes the earlier BNI-specific state and reflects the refactored general-purpose UI.

---

## 1. Executive Summary

**Use Case:** Ask the Data / Natural Language to SQL

A general-purpose AI analytics assistant that lets users ask questions about structured data in natural language.
The backend generates SQL, executes against the database, and returns a natural language answer.

The UI was originally built for a BNI banking demo and has since been refactored to a generic Cloudera-branded design,
removing all BNI-specific references so it can be reused across different banking or enterprise customers.

**Deployment target:**
- Backend as a Cloudera AI Application
- Frontend as a Cloudera AI Application

---

## 2. Demo Flow

1. User opens the frontend (Ask the Data UI)
2. User asks a question in natural language (e.g. "What is the total deposit balance right now?")
3. Frontend calls `/chat/query` for the standard SQL flow and `/chat/answer` for RAG-backed answers
4. Backend builds a prompt, generates SQL via Azure OpenAI, executes it against Impala/CDW
5. Backend returns a natural language answer plus optional visualization metadata when the SQL result is chartable
6. Frontend renders the answer in a chat-style panel and can render a chart card from the backend visualization spec

### Optional RAG Studio Flow

1. User opens the `RAG Studio` panel from the top bar
2. User enables RAG for the current chat session
3. User selects knowledge base, model, and optional advanced settings
4. Frontend saves config via backend
5. Backend creates a backing RAG session and stores it in in-memory session state
6. Subsequent chat requests in that session can be routed to RAG instead of the default SQL flow

---

## 3. Architecture

| Layer | Technology |
|---|---|
| Structured data | Impala / CDW |
| LLM provider | Azure OpenAI |
| Backend | FastAPI + Uvicorn |
| Frontend | Next.js 15 + Tailwind CSS + TypeScript |
| Deployment | Cloudera AI Applications |

### Important note
Runtime config lives in **Cloudera AI environment variables**, not in local `.env` files.
`.env.example` is documentation only.

---

## 4. Data Model

Three core tables:
- `customers`
- `deposits`
- `credits`

All join on `customer_id`. No orphan records. Date fields in `YYYY-MM-DD` format for Impala compatibility.

**Supported queries:**
- Total deposit balance
- Outstanding credit
- Top debtors by outstanding credit
- Customers per segment
- Deposits maturing in next N days
- Total deposit balance by city
- Total outstanding credit by collectibility
- Customers with both deposit and credit

---

## 5. Backend

**Stack:** FastAPI, Uvicorn, Impyla, Pydantic, OpenAI Python SDK (Azure-configured)

**Key endpoints:**
| Endpoint | Purpose |
|---|---|
| `GET /health` | App liveness check |
| `GET /health/db` | Database connectivity check |
| `GET /rag/options` | Load available RAG Studio KB + model options |
| `GET /rag/config/{session_id}` | Load saved RAG config for one chat session |
| `POST /rag/config` | Save RAG config and create backing RAG session |
| `POST /chat/answer` | Main answer endpoint for RAG-aware chat — returns `session_id`, `original_question`, `answer`, guardrails metadata, and optional sources |
| `POST /chat/query` | SQL answer endpoint — returns answer, SQL, rows, metadata, and optional visualization spec |
| `POST /sql/generate` | SQL-only generation for debugging |

**Session memory:** In-memory only (acceptable for demo; no persistence required).
This now also stores per-session RAG configuration and RAG session IDs.

**CORS:** FastAPI CORSMiddleware is removed. Cloudera Application proxy handles CORS headers.
Do not re-add middleware unless thoroughly tested — it caused duplicate CORS headers in the past.

**Deployment entry:** `backend/backend_entry.py`
- Resolves paths via `os.getcwd()` (not `__file__`, which is unavailable in JupyterWSG context)
- Launches Uvicorn via `subprocess` (not `uvicorn.run()`) to avoid running event loop conflict

### Guardrails and response safety
- Optional Guardrails config is now supported through env vars:
  - `GUARDRAILS_ENABLED`
  - `GUARDRAILS_API_KEY`
  - `GUARDRAILS_BASE_URL`
  - `GUARDRAILS_FAIL_OPEN`
- If `GUARDRAILS_BASE_URL` is not set, the backend runs in `local-only` guardrails mode
- If `GUARDRAILS_BASE_URL` is set, the backend can attempt remote Guardrails validation while still honoring `GUARDRAILS_FAIL_OPEN`
- Input-side screening can block:
  - prompt injection / jailbreak-style prompts
  - obvious out-of-scope prompts
  - requests for raw sensitive customer data
  - abusive/toxic prompts
- Output-side protection can:
  - block sensitive result-column shapes before answer narration
  - redact email / phone / long numeric identifiers from final answer text
  - return guardrails metadata for the frontend so the UI can explain blocks or redactions

### Visualization generation
- Visualization intent is now generated in the backend, not guessed in the frontend
- Backend returns a visualization spec with:
  - chart `type`
  - chart `title`
  - `x_key`
  - `y_key`
  - normalized `series`
- Current supported chart modes:
  - `bar` for comparisons
  - `line` for temporal trends
  - `pie` for small composition-style result sets
- Non-chartable query results return no visualization spec and render as answer-only

---

## 6. Frontend

**Stack:** Next.js 15 (App Router), Tailwind CSS 3, TypeScript, Inter + Manrope fonts

### Design system (adopted from fraud-ai-assistant project)
- **Sidebar:** Dark navy (`#08004D`) with indigo accent (`#5c63f2`)
- **Background:** Light grey (`#f3f5fa`)
- **Typography:** Inter (body), Manrope (headlines)
- **Radius tokens:** `--radius-panel: 22px`, `--radius-control: 16px`
- **Sidebar width:** `18rem`

### Branding
- Logo: Cloudera wordmark (`/Cloudera_logo.svg.png`) — centered in sidebar, `172px` wide
- Favicon: `/pavicon.png`
- App title: **Data Intelligence — Ask the Data**

### Key components
| Component | Location | Purpose |
|---|---|---|
| `BrandLogo` | `components/brand-logo.tsx` | Cloudera logo + app title in sidebar |
| `ChatInputPanel` | `components/chat-input-panel.tsx` | Textarea + submit with indigo button |
| `AnswerCard` | `components/answer-card.tsx` | Renders assistant response |
| `StarterCard` | `components/starter-card.tsx` | Clickable prompt suggestion cards |
| `NoticePanel` | `components/notice-panel.tsx` | Error / empty state notices |
| `RagConfigModal` | `components/rag-config-modal.tsx` | Per-session RAG Studio config panel |
| `UserMessageCard` | `components/user-message-card.tsx` | Branded user bubble with avatar tile |
| `ResultChartCard` | `components/result-chart-card.tsx` | Renders backend-provided bar/line/pie visualization specs |
| `AppShell` | `components/ui/shell.tsx` | Layout: sidebar + topbar + main |

### UI features
- Dark navy fixed sidebar with Cloudera logo + nav
- Topbar shows: breadcrumb, database connection status (green when live), latest opened datetime, refresh button, `RAG Studio`, `Clear Session`
- Welcome screen with Cloudera logo + 3 starter prompt cards
- Chat messages: styled user bubble with human avatar + assistant answer card (white surface)
- RAG-backed answers can render a structured source list under the answer card when source metadata is available
- Assistant answers now sanitize raw RAG citation markup before rendering
- Assistant answers can render cleaner paragraphs, lists, and simple pipe-table content instead of plain monospaced text blocks
- SQL-backed answers can render backend-selected charts for trend/comparison/composition questions
- Guardrails blocks or redactions can render a stronger explanatory notice below the assistant answer
- Line charts now render with a more analytical treatment:
  - clearer Y-axis reading
  - horizontal grid lines
  - area fill
  - summary metrics such as latest value and net change
  - cleaner date label formatting for temporal series
- Loading state: animated bouncing dots
- "New Conversation" button in sidebar footer resets session
- RAG config lives in a separate modal, not in the chat input area
- Layout has been adjusted to be more responsive on narrower screens
- RAG modal locks page scroll on open and avoids repeated option reloads to reduce visible modal flicker/glitch
- Topbar can show current guardrails mode from `/health` when available (`Guardrails Local` / `Guardrails Remote`)

### Starter prompts (generic, not BNI-specific)
1. "What is the total deposit balance right now?"
2. "What is the total outstanding credit right now?"
3. "Who are the customers with the highest outstanding credit?"

### API integration
- Frontend proxies backend calls through `/api/backend`
- Proxy upstream uses `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`
- Typed API client in `lib/api.ts`
- Standard SQL chat now calls `POST /chat/query`
- RAG-enabled chat still uses `POST /chat/answer`
- Both response types can include guardrails metadata
- SQL query responses can include backend-generated visualization specs
- Also calls `GET /rag/options`, `GET /rag/config/{session_id}`, and `POST /rag/config`

**Deployment entry:** `frontend/frontend_entry.py`
- Resolves port from `CDSW_APP_PORT`
- Runs `npm install` + `next build` + `next start`

---

## 7. Known Deployment Rules

1. **Both Applications must have "Allow Unauthenticated Access" enabled** — otherwise frontend gets 302 redirects to login when calling backend
2. **Do not use `.sh` as Application script** — Cloudera Application script picker may not list `.sh` files; use Python launchers
3. **Do not re-add FastAPI CORSMiddleware** — Cloudera proxy already sets CORS headers; middleware causes duplicate headers and browser rejection
4. **Session proxy in VS Code session ≠ Application behavior** — asset path issues in session proxy do not predict Application failure

---

## 8. Environment Variables

### Backend (set in Cloudera AI)
- Impala / CDW connection: host, port, database, auth
- Azure OpenAI: endpoint, key, deployment name, model name
- `RAG_BASE_URL` or `AGENT_BASE_URL` for RAG Studio integration
- `GUARDRAILS_ENABLED`
- `GUARDRAILS_API_KEY`
- `GUARDRAILS_BASE_URL`
- `GUARDRAILS_FAIL_OPEN`

### Frontend (set in Cloudera AI)
- `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` — full URL of the backend Application

---

## 9. Current State

### UI
- [x] Fully refactored from BNI-specific to generic Cloudera-branded design
- [x] Design system aligned with fraud-ai-assistant project (same color tokens, fonts, shell layout)
- [x] All BNI references removed from UI text and prompts
- [x] Cloudera logo + favicon in place
- [x] Database status indicator (live green/red based on `/health/db`)
- [x] Latest opened datetime shown in topbar
- [x] Dedicated RAG Studio config modal implemented
- [x] `Clear Session` implemented
- [x] Responsive shell and modal behavior improved
- [x] Modal scroll locking and deferred option loading added to reduce opening glitch
- [x] Footer actions in RAG config modal no longer easily clip off-screen
- [x] Frontend can fall back to hardcoded RAG KB/model defaults if live `/rag/options` is still failing in a stale backend deployment
- [x] Answer card supports rendering structured RAG sources instead of raw source objects
- [x] Answer card now uses a bot emoji marker instead of the earlier plus icon
- [x] User/assistant message alignment has been adjusted to feel more balanced in wide chat layouts
- [x] User bubble has been upgraded to a more polished human-style card with avatar marker
- [x] Frontend now renders backend-provided visualization cards for chartable SQL answers
- [x] Frontend can explain guardrails blocks or redactions inline in the chat UI
- [x] Guardrails notice UX now looks more intentional with policy-oriented wording, badges, and safer follow-up suggestions
- [x] Line chart visualization has been upgraded from a simple decorative line into a more comprehensive analytical chart treatment
- [x] Topbar can display backend-reported guardrails runtime mode
- [x] RAG source cards now prefer an `Open Source PDF` action instead of implying guaranteed inline preview

### Backend
- [x] Implemented and deployed
- [x] Azure OpenAI integration working
- [x] Impala/CDW query execution working
- [x] `/chat/answer` endpoint working
- [x] RAG config endpoints implemented
- [x] RAG session creation working with complete payload
- [x] Human-readable validation errors added for incomplete RAG config
- [x] RAG source extraction added from chat history into a structured `sources` payload for UI rendering
- [x] RAG answer text is sanitized to strip citation anchor markup before the response is sent to the frontend
- [x] Guardrails service added for input screening, output redaction, and result-shape blocking
- [x] `/health` and `/` now expose guardrails runtime mode/status
- [x] Backend visualization service now returns explicit chart specs for SQL answers
- [x] `guardrails-ai` dependency added and backend test environment verified in Python 3.11
- [x] Backend tests updated and passing locally (`21 tests`)
- [x] A standalone Azure OpenAI connection test script now exists for local/runtime credential validation

### Demo readiness
- [x] End-to-end flow working
- [x] UI polished and generic enough to reuse for any banking/enterprise customer
- [x] Frontend fallback RAG defaults added:
  - Knowledge base: `BPJS-Claim-Knowledge (291)`
  - Chat model: `meta.llama3-8b-instruct-v1:0`
- [x] Source rendering support added for RAG answers
- [x] Cleaner display support added for list/table-style answers in the main chat card
- [x] Local frontend build verified successfully with the workspace-installed Node runtime
- [ ] Backend runtime env vars need to be set per customer environment
- [ ] CAI backend should be redeployed with the latest guardrails + visualization changes
- [ ] CAI frontend should be redeployed with the latest visualization + guardrails UI changes
- [ ] Until redeployed, frontend may rely on hardcoded fallback options if live `/rag/options` still fails
- [ ] RAG source card rendering depends on the exact `chat-history` payload shape returned by the target RAG Studio instance
- [ ] `Open Source PDF` behavior still depends on upstream RAG file download headers; some documents may open inline while others may download directly
- [ ] Remote Guardrails mode still requires `GUARDRAILS_BASE_URL`; otherwise backend runs in `local-only` mode
- [ ] Frontend/CAI smoke test still needed for guardrails badge and backend-driven visualization behavior in deployed Applications

---

## 10. Resume Instructions

When resuming in a new session, assume:
1. Use case is Ask the Data / NL-to-SQL
2. UI is a generic Cloudera-branded analytics assistant (not BNI-specific)
3. Design system is shared with `fraud-ai-assistant` — adopt changes from there for consistency
4. Backend: FastAPI, deployed as CAI Application, CORS middleware removed
5. Frontend: Next.js 15, deployed as CAI Application, indigo+navy design system
6. Runtime config lives in Cloudera AI env vars — do not touch `.env.example` for runtime
7. Guardrails and backend-driven visualization are now part of the latest state
8. Major deployment blockers already solved — focus on CAI validation, polish, or feature additions

---

End of project state.
