# BNI Demo Project State — Latest End-to-End Deployment State

## Document Purpose

This document captures the full working understanding of the BNI demo project up to the latest successful state.
It is intended to be used as a handoff/reference file so the work can continue in a new ChatGPT session or be preserved locally.

This version supersedes the earlier project state and includes:
- business context
- delivery narrative
- architecture decisions
- data design
- prompt-driven build approach
- backend and frontend implementation understanding
- deployment hardening
- Cloudera AI Application deployment issues and resolutions
- the final known-good state

---

# 1. Executive Summary

The project is a customer-facing demo for BNI focused on a single AI use case.

## Selected Use Case
Ask the Data / Zero Query / Natural Language to SQL

The demo flow is:
1. User asks a question in natural language
2. Backend generates SQL using Azure OpenAI
3. SQL is executed against curated Impala/CDW tables
4. Backend generates a natural language answer
5. Frontend displays the answer in a polished banking-style chat UI

The final deployment target is:
- Backend as a Cloudera AI Application
- Frontend as a Cloudera AI Application

The project is demo-only, not production-ready, and all engineering decisions were intentionally kept as lean as possible while still making deployment practical.

---

# 2. Business and Delivery Context

## Original customer context
Initially, three use cases were discussed with the customer.
There was also an expectation gap around delivery effort, with the customer assuming some use cases could be done in 2 to 3 days.

## Delivery narrative developed
A customer-facing narrative was created to explain that:
- 2 to 3 days may be enough for a narrow showcase or constrained happy-path demo
- but it is not enough for a credible enterprise-grade use case implementation
- a 2-week-per-use-case estimate from PS Singapore was positioned as already lean for a minimum viable enterprise build

## Delivery level framework
The narrative distinguished between:
1. Rapid Demo
2. Functional Pilot
3. Production-Ready Solution

This framework was used to communicate that these three levels should not be measured by the same timeline.

---

# 3. Customer-Facing Storyline and Slide Direction

A 6-slide story deck was brainstormed and visually mocked in a Cloudera-style template.

## Slide set
1. From Fast Demo to Enterprise-Ready AI Use Case
2. Three Levels of Delivery
3. What 2 to 3 Days Can Realistically Deliver
4. Minimum Build Path for One Use Case
5. Why the Timeline Is Already Minimal
6. Recommended Engagement Approach

## Visual style
Slides were aligned with the Cloudera deck style already used by the user:
- light grey background
- large dark navy titles
- blue subtitles
- orange highlights
- purple rounded-square motifs
- clean executive whitespace
- Cloudera logo placement bottom-right

Prompt-based visuals were generated for these slides to establish direction before final design.

---

# 4. Strategic Scope Reduction to a Single Demo

After discussing all three use cases, the project was intentionally narrowed to a single demo.

## Final selected demo
Use Case 1: Ask the Data / Natural Language to SQL

## Demo objective
The goal is not to prove enterprise completeness.
The goal is to show:
- natural language interaction
- SQL generation
- query execution
- answer generation
- a believable banking-style user experience

## Time constraint framing
The demo was treated as a constrained showcase, not an enterprise implementation.

---

# 5. Final Architecture

## Runtime pattern
The final runtime architecture is:
1. Impala / CDW
   - stores curated demo data
   - serves as structured data source

2. Azure OpenAI
   - used as the LLM provider
   - generates SQL
   - generates natural language answers

3. FastAPI backend
   - owns backend APIs
   - builds prompts
   - validates and guards SQL
   - executes queries
   - generates answer text
   - manages session and memory

4. Next.js frontend
   - modern banking-style UI
   - chat-like experience
   - rendered as a separate Cloudera AI Application

5. Cloudera AI Applications
   - backend application
   - frontend application

## Important note on CAI usage
In this project, the runtime target is Cloudera AI Workbench + Applications, not model hosting via AI Inference service.

The original discussion touched CAI conceptually, but the actual implementation path became:
- host backend and frontend as Applications
- use Azure OpenAI external endpoint as the model provider

---

# 6. Data Model

The demo was simplified to three core tables only.

## Tables
1. customers
2. deposits
3. credits

## Reason for only three tables
This was a deliberate simplification to keep the demo realistic but manageable.

Benefits:
- enough to show joins
- enough to support business questions
- small enough to explain clearly
- strong enough to demonstrate Ask the Data value

## Join rule
A hard requirement was set that:
- deposits.customer_id must always reference customers.customer_id
- credits.customer_id must always reference customers.customer_id
- no orphan records are allowed
- tables must be directly joinable
- date fields must be generated in YYYY-MM-DD format for Impala friendliness

## Business questions supported
The dataset was designed to support prompts such as:
- Berapa total saldo deposito saat ini?
- Siapa nasabah dengan saldo deposito tertinggi?
- Berapa total outstanding kredit saat ini?
- Siapa nasabah dengan outstanding kredit tertinggi?
- Berapa jumlah nasabah per segmen?
- Tampilkan customer dengan deposito jatuh tempo dalam 14 hari
- Tampilkan total saldo deposito aktif per kota
- Tampilkan total outstanding kredit per collectibility
- Tampilkan nasabah yang memiliki deposito dan kredit sekaligus

---

# 7. Prompt-Driven Build Methodology

A major part of the project was built using vibe coding with Codex.

## Key process
- local Mac + VS Code were used only for code generation and iteration
- prompts were written phase-by-phase
- code was generated in local development flow
- runtime testing and real deployment happened inside Cloudera AI VS Code session and Cloudera AI Applications

## Important environment strategy
There is no dependency on local .env for runtime truth.

### Runtime config source of truth
Cloudera AI environment variables

This means:
- local is for coding only
- CAI holds actual runtime env vars
- .env.example files are documentation only, if present

---

# 8. Phased Build Understanding

The uploaded phase history showed the project was built modularly, not ad hoc.

The implementation covered:
- backend foundation
- Azure OpenAI integration
- session and memory
- SQL guardrails
- schema and business context
- frontend UI
- answer generation
- rendering of answers and results

This means the current codebase is the result of a structured build sequence, not random experimentation.

---

# 9. Backend Implementation Understanding

## Stack
- FastAPI
- Uvicorn
- Impyla
- Pydantic / pydantic-settings
- OpenAI Python SDK configured for Azure OpenAI
- Python standard-library CSV demo data generator

## Main backend responsibilities
- load runtime config from CAI environment
- connect to Impala/CDW
- expose health and query endpoints
- build prompts using schema context and business context
- generate SQL via Azure OpenAI
- apply SQL guardrails
- execute SQL
- generate natural language answer
- manage session memory

## API endpoints understood
The backend exposes:
- /
- /health
- /health/db
- /tables
- /sql/generate
- /sql/execute
- /chat/query
- /chat/answer

## Important endpoint distinction
### /sql/generate
- generates SQL only
- used for debugging and validation

### /chat/query
- full debug payload
- includes answer, SQL, rows, metadata

### /chat/answer
- added specifically for the demo
- returns only:
  - session_id
  - original_question
  - answer

This made the frontend simpler and cleaner for customer-facing behavior.

## Session/memory
Memory is currently in-memory only.

This is acceptable for demo use because:
- no persistence is required
- session continuity is short-term only
- restart persistence is not a requirement

---

# 10. Frontend Implementation Understanding

## Stack
- Next.js App Router
- Tailwind CSS
- TypeScript

## Frontend responsibilities
- render banking-style ask-the-data UI
- call backend APIs
- show status refresh
- show question messages
- show answer messages
- show user-friendly error state

## Frontend API integration
The frontend uses:
- NEXT_PUBLIC_API_BASE_URL

and calls backend through a typed API layer.

## Important response contract
The frontend chatAnswer() call correctly expects:
- session_id
- original_question
- answer

This matches /chat/answer.

---

# 11. Deployment Hardening Decisions

A minimal deployment hardening pass was applied.

## Philosophy
Because this is only for a demo:
- do not redesign
- do not over-engineer
- make only the minimum changes required for deployment stability

## Backend deployment hardening
- created backend_entry.py
- added deployment-aware path/port resolution
- adapted execution model to Cloudera AI launcher behavior
- avoided relying on __file__ because Cloudera executed the script in a JupyterWSG-style context
- avoided uvicorn.run() directly due to running event loop conflict
- used subprocess execution to launch uvicorn

## Frontend deployment hardening
- .sh script was not selectable by Application script picker
- switched to frontend_entry.py
- Python launcher used to:
  - resolve port
  - resolve frontend dir
  - ensure Node/npm available
  - run npm install/ci when needed
  - run build
  - run frontend start
- avoided using .next/standalone/server.js because it caused port issues
- explicitly started Next using:
  - node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port <port>

---

# 12. Cloudera AI Session Testing Milestones

## Backend session testing
The backend was successfully tested in CAI terminal session using a manual port such as 8001.

Tested successfully:
- /health
- /sql/generate
- /chat/answer

This confirmed:
- backend startup was fine
- Azure OpenAI worked
- SQL generation worked
- Impala execution worked
- natural language answer generation worked

## Session browser port testing
Direct testing with CDSW_APP_PORT in VS Code session caused port conflicts because the browser-based editor already used that port.

This was not treated as a blocker.

## Frontend session testing
Frontend session testing confirmed:
- local UI styling works when served directly
- proxy mode in session (/proxy/<port>/) caused asset path issues
- this was not treated as a final blocker because the real target was Application deployment, not session proxy

---

# 13. Backend Application Deployment Journey

## Initial issues encountered
Several deployment issues happened before backend finally ran successfully.

### Issue 1: script path not found
Cloudera log reported:
- open backend/backend_entry.py: no such file or directory

This led to identifying the correct script path pattern:
- bni-demo/backend/backend_entry.py

### Issue 2: __file__ not defined
Because Cloudera was executing the script through JupyterWSGLauncher, __file__ was unavailable.

Fix:
- stop relying on __file__
- resolve directories based on current working directory heuristics

### Issue 3: asyncio.run() cannot be called from a running event loop
This happened because uvicorn.run() was called inside a launcher context that already had an event loop.

Fix:
- launch Uvicorn via subprocess instead of calling uvicorn.run() directly

## Final backend deployment success
After adapting backend_entry.py, the backend Application successfully ran and served the FastAPI app.

The backend app URL became functional.

---

# 14. Frontend Application Deployment Journey

## Initial issue: .sh script not selectable
The Application script picker did not expose .sh files.

Fix:
- replace shell launcher with Python launcher: frontend_entry.py

## Initial issue: next not found
In session testing, next was missing because dependencies were not installed.

Fix:
- npm install
- launcher ensured runtime install/build flow

## Initial issue: EADDRINUSE on standalone server
Using .next/standalone/server.js led to port binding conflicts on 0.0.0.0:8100.

Fix:
- stop using standalone server start path
- explicitly use:
  - node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port <port>

## Final frontend deployment
With the Python launcher, the frontend Application ran successfully and UI styling rendered correctly in the Application URL.

---

# 15. CORS and Cross-App Communication Debugging

After both Applications ran, the next major issue was cross-origin communication between frontend and backend.

## Symptom progression

### Phase 1
fetch failures appeared as:
- Failed to fetch
- apparent CORS/network problems

### Phase 2
Network inspection showed:
- 302 redirect to login for backend requests
- this was traced to unauthenticated/public access handling

### Phase 3
Both frontend and backend Applications were configured with:
- Allow Unauthenticated Access = enabled

This removed login redirect issues.

### Phase 4
Then true CORS issues remained:
- preflight OPTIONS returned 204
- actual request still failed in browser
- terminal curl showed conflicting response headers

## Key diagnostic evidence
The critical curl evidence showed:

### Preflight response
- Access-Control-Allow-Origin: https://ask-data-ui...

### Actual GET response
Contained two ACAO headers:
- one specific frontend origin
- one *

This proved that:
- one layer already set correct origin
- FastAPI was adding a second wildcard origin
- browser rejected the response due to conflicting CORS headers

## Root cause
The FastAPI app still had CORSMiddleware enabled with permissive settings, while the Cloudera platform/proxy was also managing CORS headers.

This caused duplicate/conflicting CORS headers.

## Fix applied
The solution was to remove FastAPI CORSMiddleware entirely and allow the Cloudera Application/proxy layer to provide the correct CORS headers.

After removing the middleware and redeploying backend, the frontend/backend communication succeeded.

---

# 16. Final Known-Good CORS State

## Final understanding
At the end of the debugging process:
- unauthenticated access is enabled for both frontend and backend Applications
- backend no longer injects conflicting FastAPI CORS headers
- Cloudera proxy/application layer provides the usable CORS behavior
- frontend requests to backend work successfully

This was the final blocker before the stack became operational end-to-end.

---

# 17. Final Known-Good Runtime State

## Backend
- deployed as Cloudera AI Application
- script path uses bni-demo/backend/backend_entry.py
- backend responds successfully from public app URL
- endpoints function correctly

## Frontend
- deployed as Cloudera AI Application
- uses Python launcher frontend_entry.py
- can render styled UI correctly in Application URL
- points to backend through NEXT_PUBLIC_API_BASE_URL

## Communication
- frontend successfully calls backend
- backend successfully calls Azure OpenAI
- backend successfully queries Impala/CDW
- Ask the Data flow is working

---

# 18. Important Runtime Variables

## Backend
Runtime variables are managed in Cloudera AI settings.

Important families include:
- app config
- Impala / CDW connection values
- Azure OpenAI endpoint, key, deployment, model

## Frontend
Important variable:
- NEXT_PUBLIC_API_BASE_URL=<backend app url>

## Important principle
Do not treat local .env as runtime truth.
Cloudera AI is the source of truth for runtime env vars.

---

# 19. Final Code/Deployment Lessons Learned

## 1. Cloudera Application script picker may not support .sh
For this project, Python launchers were the safer Application script format.

## 2. JupyterWSGLauncher behavior matters
Application scripts may run in a context that is not identical to file execution in a terminal.

Consequences:
- __file__ may not be available
- direct uvicorn.run() can fail because of running event loop
- launching server as subprocess is safer

## 3. Session proxy path is not equal to final Application behavior
Session proxy can break asset paths in Next.js.
This did not imply the final Application would fail.

## 4. CORS debugging must distinguish:
- auth redirects
- preflight success
- actual response header conflicts

This project hit all three in sequence.

---

# 20. Final Recommended Resume Strategy for a New Session

If this project is resumed in a future chat, the assistant should assume:
1. The demo is Ask the Data
2. The architecture is:
   - frontend Application
   - backend Application
   - Azure OpenAI
   - Impala/CDW
3. The codebase is already built and mostly working
4. Runtime config lives in Cloudera AI
5. Public unauthenticated access is enabled
6. FastAPI CORSMiddleware should remain removed unless there is a strong reason otherwise
7. The major deployment blockers have already been solved
8. Future work should focus on polish, demo flow, validation, or enhancements, not rebuilding the foundation

---

# 21. Final Current State Summary

## Business state
- single use case selected
- customer-facing demo narrative built

## Technical state
- backend implemented
- frontend implemented
- data model implemented
- Ask the Data flow working

## Deployment state
- backend Application running
- frontend Application running
- cross-origin communication working
- major runtime issues resolved

## Demo readiness
The project has reached a working end-to-end deployed demo state.

---

# 22. Handy Short Resume Block

### Project
BNI Demo

### Use case
Ask the Data / Natural Language to SQL

### Data
- customers
- deposits
- credits

### Backend
- FastAPI
- Azure OpenAI
- Impala/CDW
- SQL guardrails
- session + answer generation

### Frontend
- Next.js
- Tailwind
- banking-style ask-the-data UI

### Deployment
- backend as Cloudera AI Application
- frontend as Cloudera AI Application

### Key issues solved
- script path resolution
- JupyterWSG launcher quirks
- event loop conflicts
- frontend launcher compatibility
- asset/proxy behavior
- auth redirects
- duplicate/conflicting CORS headers

### Final outcome
Working end-to-end deployed demo in Cloudera AI.

---

End of latest project state.
