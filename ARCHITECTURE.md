## AI Presentation Assistant — Architecture

This document describes the **as-built architecture** of the `ai-presentation-assistant` repository (aligned with the current codebase and `docker-compose.yml`). The goal is to help contributors quickly understand how the system works, which components own which responsibilities, and the primary data/request flows.

---

## System overview

This project converts **presentation files (PDF/PPTX) into content**, indexes them using **pgvector**, and then provides:

- **RAG-based Q&A** over the presentation content
- **Voice-command slide navigation during live presenting** (WebSocket + intent analysis)
- **Planner/reminders** (email reminder worker)

It is a Docker Compose–orchestrated web application.

---

## Architectural goals

- **Separation of concerns**: UI (Next.js) + API (FastAPI) + DB (PostgreSQL/pgvector)
- **Real-time control**: low-latency command broadcasting during live presenting (WS)
- **Content-based access**: embeddings + vector search over slide text to retrieve context
- **Safe file ingestion**: magic-bytes validation in addition to extension checks, size limits, filename sanitization
- **Simple local development**: a compose topology that starts with one command

---

## Out of scope (for now)

- Multi-tenant architecture / isolated tenant schemas
- Async processing via a separate job queue (Celery/RQ/Kafka)
- External identity providers (OAuth/SAML)
- Distributed observability (tracing/metrics) infrastructure

---

## Components (containers/topology)

`docker-compose.yml` üç ana servisi ayağa kaldırır:

`docker-compose.yml` brings up three primary services:

- **Frontend** (`frontend/`): Next.js (React), App Router
  - Port: `3000`
  - API access: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)
  - WebSocket access: `NEXT_PUBLIC_WS_URL` (otherwise `ws://<host>:8000`)
- **Backend** (`backend/`): FastAPI + Uvicorn (with reload)
  - Port: `8000`
  - API prefix: `/api/v1`
  - Static file serving: `/uploaded_files` (on disk: `backend/uploaded_files/`, or `/app/uploaded_files` in the container)
- **DB**: PostgreSQL + `pgvector` (image: `ankane/pgvector`)
  - Host port: `5435` → container `5432`
  - Init: `scripts/init.sql` creates `presentation_db` and enables the `vector` extension

---

## Runtime view

### HTTP (REST)

- The frontend calls the backend via an `axios` client: `frontend/app/api/client.ts`
- For authenticated endpoints, `Authorization: Bearer <JWT>` is automatically attached (token read from `localStorage`).

### WebSocket (live orchestration)

- The live presentation screen (`frontend/app/presentation/[id]/page.tsx`) connects via WebSocket:
  - WS: `/api/v1/orchestration/ws/presentation/{presentation_id}?token=...`
- The backend WS endpoint (`backend/app/api/v1/orchestration.py`) extracts intent from incoming transcript messages and broadcasts `COMMAND` messages to all connected clients.

---

## Backend structure (high level)

### Entry point and routers

- Application entry point: `backend/main.py`
  - On startup:
    - `CREATE EXTENSION IF NOT EXISTS vector`
    - `create_all` for SQLAlchemy models
    - Planner reminder worker: `run_reminder_worker()` (unless `TESTING` is set)
  - Routers:
    - `auth`, `presentations`, `chat`, `orchestration`, `planner`, `ideas`

### Layers

- **API layer**: `backend/app/api/v1/*`
- **Core (config/db/security/logging)**: `backend/app/core/*`
- **Models (ORM)**: `backend/app/models/presentation.py`
- **Schemas (Pydantic)**: `backend/app/schemas/*`
- **Services**: `backend/app/services/*`

---

## Data model (PostgreSQL + pgvector)

Key tables (ORM: `backend/app/models/presentation.py`):

- `users`: identity, profile, timezone
- `user_preferences`: language, ideal duration, notification preferences (1:1)
- `presentations`: file metadata, status (uploaded/analyzing/completed/failed), guest fields
- `slides`: slide content (`content_text`) + embedding (`Vector(1536)`)
  - Index: `hnsw` + `vector_cosine_ops` (for performance)
- `presentation_sessions`: live/rehearsal session records + `current_slide_index`
- `presentation_analyses`: analysis scores and JSON content
- `planner_events`: scheduled presentation time + optional reminder time
- `verification_tokens`, `email_change_verifications`: token / code management
- `activity_logs`: audit trail

> Note: Many relationships are defined with `CASCADE`; deleting a user removes related data automatically.

---

## Critical flows (end-to-end)

### 1) Upload → text extraction → embeddings → write to pgvector

**Trigger:** `POST /api/v1/presentations/upload` (`backend/app/api/v1/presentations.py`)

Flow:

1. **File validation**
   - Extension check (`.pdf` / `.pptx`)
   - Size limit: 50MB
   - Magic-bytes type validation: `file_validator.validate_file_type(...)`
   - Filename sanitization + unique id for a safe filename
2. **Persist to disk**
   - `uploaded_files/<userId>_<uuid>_<safe_name>`
3. **Text extraction**
   - PDF: `pdf_service.extract_text_from_pdf(...)`
   - PPTX: `pptx_service.extract_text_from_pptx(...)`
   - Additionally for PPTX browser preview: `pptx_service.convert_to_pdf_preview(file_path)`
4. **Embedding generation**
   - Batched + parallel: `embedding_service.create_embeddings_batch(slide_texts)`
   - Model: `text-embedding-3-small`
5. **Write to DB**
   - `vector_db.save_presentation_with_slides(...)`
   - Presentation status: `ANALYZING` → `COMPLETED` (or `FAILED` on error)

Output:

- presentation `id`
- `pdf_preview_path` (for PPTX)
- `pages`/`slide_count`

### 2) Chat (RAG) over the presentation

**Trigger:** `POST /api/v1/chat/{presentation_id}` (`backend/app/api/v1/chat.py`)

Flow (`backend/app/services/rag_service.py`):

1. Question embedding: `embedding_service.create_embedding(question)`
2. Slide retrieval:
   - If `current_slide` is provided, it is included first
   - Remaining slots are selected via pgvector ordering: `Slide.embedding.l2_distance(query_vector)`
3. LLM answer generation:
   - Model: `gpt-4o-mini`
   - The prompt enforces:
     - Respond in the user's language
     - If the answer relies on presentation context, **page references are required** (`[Sayfa X]`)

Output:

- `answer`
- `sources`: page numbers
- `context_used`: the retrieved context (debug/traceability)

### 3) Live presenting → browser STT → WebSocket → intent → slide control

**Frontend (STT):** `frontend/app/presentation/[id]/page.tsx`

- Uses the browser SpeechRecognition API (Chromium-based):
  - Interim transcript is shown in the UI
  - Final transcript is sent to the backend via WS
- Local (frontend) commands (zoom) are detected via if/else:
  - “yakınlaştır/zoom in”, “uzaklaştır/zoom out”, “sıfırla/reset”
  - These commands are independent of slide navigation and execute via `PresentationViewer`

**Backend (WS):** `backend/app/api/v1/orchestration.py`

1. WS handshake:
   - User verification from `token` query param (`resolve_user_id_from_token`)
   - If unauthenticated, closes with `4001` (frontend redirects to login)
2. Session management:
   - Client can send “SESSION_EVENT START/END”
   - The session’s `current_slide_index` is persisted to the DB
3. Intent analysis:
   - Only for `is_final=true` transcripts
   - `intent_service.analyze_intent(text, current_slide, total_slides)`
   - Model: `gpt-4o-mini`, JSON `response_format`
4. Command broadcasting:
   - `COMMAND` mesajı ile `NEXT_SLIDE` / `PREVIOUS_SLIDE` / `JUMP_TO_SLIDE`
   - The frontend receives the command and navigates via `goToPage()` / next/prev

---

## Security approach

### Authentication (JWT)

- Token creation: `backend/app/core/security.py` (`create_access_token`)
- Auth middleware/dependency:
  - `Authorization: Bearer <token>`
  - Endpoints like `/api/v1/auth/me` resolve the user via `get_current_user`

### Rate limiting

- SlowAPI limits for login and forgot-password:
  - `/auth/login`: `5/minute`
  - `/auth/forgot-password`: `3/minute`

### File safety

- Size limits and empty-file checks
- Magic-bytes validation (do not trust extension alone)
- Filename sanitization to prevent path traversal
- Disk cleanup on errors (uploaded file cleanup)

### Frontend security headers

`frontend/next.config.js` ile global header’lar:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: `camera=(), microphone=(self), geolocation=()`

> Microphone permission is only needed for browser-side STT; the backend does not need microphone access.

---

## Configuration and environment variables

### Backend (`backend/app/core/config.py`)

Required:

- `DATABASE_URL`
- `OPENAI_API_KEY`

Important:

- `SECRET_KEY` (must be changed in production)
- `FRONTEND_URL` (for reset links)
- SMTP variables (for sending email): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- `CORS_ORIGINS` (can be overridden using JSON array string format)

Examples: `.env.example`

### Frontend

- `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- `NEXT_PUBLIC_WS_URL` (default: `ws://<host>:8000`)

---

## Development and running

### Docker Compose

- All services:
  - `docker compose up --build`
- Shutdown:
  - `docker compose down`
- DB port mapping:
  - Host: `5435` → Container: `5432`

### Backend (local)

The repo README and `backend/BACKEND_STRUCTURE.md` contain venv and test instructions.

### Frontend (local)

`frontend/FRONTEND_STRUCTURE.md` contains lint/tsc/test instructions.

---

## Background jobs (background worker)

Planner reminder worker:

- Start: `run_reminder_worker()` within the `backend/main.py` lifespan
- Cycle: every 60 seconds (`POLL_INTERVAL_SECONDS = 60`)
- Job: send emails for events in `planner_events` where `reminder_at <= now` and `reminder_sent_at is NULL`
- Email: `backend/app/services/email_service.py`

---

## Error handling and resilience

- In the backend:
  - custom exception handlers (`main.py`)
  - controlled error messages for embedding/AI failures
- In the upload flow:
  - on any error → attempts filesystem cleanup
  - DB records `FAILED` status and `error_message`
- On the WS path:
  - parse errors are logged; the connection is kept alive when possible

---

## Testing strategy (current)

Backend:

- Pytest-based tests: `backend/tests/*`
- Additional security/lint: `bandit`, `flake8`, `safety` (commands are in `BACKEND_STRUCTURE.md`)

Frontend:

- `eslint`, `tsc --noEmit`, `vitest` (commands are in `FRONTEND_STRUCTURE.md`)

---

## Design decisions (brief)

- **pgvector + HNSW index**: low-latency similarity search for slide retrieval
- **Browser STT**: low operational cost; infrastructure is simpler because audio streaming is not moved to the backend
- **WebSocket broadcast**: naturally supports multiple clients (presentation screen / control screen) scenarios
- **Docker Compose**: fast local setup for development and demos

---

## Improvement opportunities (roadmap notes)

- Move the upload/embedding pipeline into the background via a job queue (Celery/RQ) to reduce API latency
- Observability: structured logging + metrics (Prometheus) + tracing (OpenTelemetry)
- Secrets: production secret management (Vault/SSM) + `SECRET_KEY` rotation
- RAG: retrieval strategy (top-k, rerank) and prompt versioning

