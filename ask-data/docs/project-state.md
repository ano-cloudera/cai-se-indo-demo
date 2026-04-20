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
3. Frontend calls `/chat/answer` on the backend
4. Backend builds a prompt, generates SQL via Azure OpenAI, executes it against Impala/CDW
5. Backend returns a natural language answer
6. Frontend renders the answer in a chat-style panel

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
| `POST /chat/answer` | Main demo endpoint — returns `session_id`, `original_question`, `answer` |
| `POST /chat/query` | Debug endpoint — returns full payload with SQL and rows |
| `POST /sql/generate` | SQL-only generation for debugging |

**Session memory:** In-memory only (acceptable for demo; no persistence required).

**CORS:** FastAPI CORSMiddleware is removed. Cloudera Application proxy handles CORS headers.
Do not re-add middleware unless thoroughly tested — it caused duplicate CORS headers in the past.

**Deployment entry:** `backend/backend_entry.py`
- Resolves paths via `os.getcwd()` (not `__file__`, which is unavailable in JupyterWSG context)
- Launches Uvicorn via `subprocess` (not `uvicorn.run()`) to avoid running event loop conflict

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
| `AppShell` | `components/ui/shell.tsx` | Layout: sidebar + topbar + main |

### UI features
- Dark navy fixed sidebar with Cloudera logo + nav
- Topbar shows: breadcrumb, database connection status (green when live), latest opened datetime, refresh button
- Welcome screen with Cloudera logo + 3 starter prompt cards
- Chat messages: user bubble (dark navy) + assistant answer card (white surface)
- Loading state: animated bouncing dots
- "New Conversation" button in sidebar footer resets session

### Starter prompts (generic, not BNI-specific)
1. "What is the total deposit balance right now?"
2. "What is the total outstanding credit right now?"
3. "Who are the customers with the highest outstanding credit?"

### API integration
- Uses `NEXT_PUBLIC_API_BASE_URL` env var
- Typed API client in `lib/api.ts`
- Calls `POST /chat/answer` → expects `{ session_id, original_question, answer }`

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

### Frontend (set in Cloudera AI)
- `NEXT_PUBLIC_API_BASE_URL` — full URL of the backend Application

---

## 9. Current State

### UI
- [x] Fully refactored from BNI-specific to generic Cloudera-branded design
- [x] Design system aligned with fraud-ai-assistant project (same color tokens, fonts, shell layout)
- [x] All BNI references removed from UI text and prompts
- [x] Cloudera logo + favicon in place
- [x] Database status indicator (live green/red based on `/health/db`)
- [x] Latest opened datetime shown in topbar

### Backend
- [x] Implemented and deployed
- [x] Azure OpenAI integration working
- [x] Impala/CDW query execution working
- [x] `/chat/answer` endpoint working

### Demo readiness
- [x] End-to-end flow working
- [x] UI polished and generic enough to reuse for any banking/enterprise customer
- [ ] Backend runtime env vars need to be set per customer environment

---

## 10. Resume Instructions

When resuming in a new session, assume:
1. Use case is Ask the Data / NL-to-SQL
2. UI is a generic Cloudera-branded analytics assistant (not BNI-specific)
3. Design system is shared with `fraud-ai-assistant` — adopt changes from there for consistency
4. Backend: FastAPI, deployed as CAI Application, CORS middleware removed
5. Frontend: Next.js 15, deployed as CAI Application, indigo+navy design system
6. Runtime config lives in Cloudera AI env vars — do not touch `.env.example` for runtime
7. Major deployment blockers already solved — focus on polish or feature additions

---

End of project state.
