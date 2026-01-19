# Project: Backend Directory Structure

Terminal-style ASCII tree showing the `backend/` folder structure with one-line descriptions.

```bash
backend/
├── Dockerfile ..................... Docker build instructions for the backend service image
├── main.py ........................ FastAPI application entrypoint; mounts routers and configures startup
├── requirements.txt ............... Python dependencies installed into the container or venv
├── logs/ .......................... Runtime log output directory (local/dev logging files)
├── uploaded_files/ ................ Persisted user uploads (PDF/PPTX) before/while processing
└── venv/ .......................... Local virtual environment (development only; excluded from builds)

backend/app/
├── __init__.py .................... Package marker for the application
│
├── api/
│   └── v1/
│       ├── auth.py ................ Authentication endpoints (login, token issuance, JWT flows)
│       ├── chat.py ................ Chat and RAG endpoints handling conversational requests
│       └── presentations.py ....... Upload endpoints and ingestion orchestration for PDF/PPTX
│
├── core/
│   ├── config.py .................. Pydantic Settings with environment-backed defaults (ENV, logging, secrets, DB keys)
│   ├── database.py ................ Async SQLAlchemy engine/session creation and helpers
│   ├── exceptions.py .............. Custom application exceptions and global exception handlers
│   ├── logger.py .................. Central loguru setup and formatting wrappers
│   └── security.py ................ Password hashing and JWT token utilities
│
├── models/
│   └── presentation.py ............ ORM models for Presentation and Slide stored in Postgres/pgvector
│
├── schemas/
│   ├── auth.py .................... Pydantic schemas for auth requests/responses
│   └── chat.py .................... Pydantic schemas for chat/RAG payload validation
│
└── services/
    ├── embedding_service.py ....... OpenAI embedding wrapper with batching and concurrency limits
    ├── file_validator.py .......... Magic-bytes, size, page-count and basic file sanity checks
    ├── pdf_service.py ............. PDF text extraction, cleaning (null-bytes), and PDF-specific checks
    ├── pptx_service.py ............ PPTX slide and speaker-note extraction and security checks
    ├── rag_service.py ............. High-level RAG orchestration (retrieval + generation helpers)
    ├── vector_db.py ............... Persists embeddings and slide metadata to Postgres + pgvector
    └── file_cleanup.py ............ Cleanup policies for failed/expired guest uploads
```

## Environment Requirements

**Required Variables:**

- `DATABASE_URL` - PostgreSQL connection string with pgvector support
- `OPENAI_API_KEY` - OpenAI API key for embeddings and chat completions

**Optional Variables:**

- `ENV` - Environment mode (development/production), default: `development`
- `ENABLE_LOGGING` - Enable/disable logging, default: `true`
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARNING/ERROR), default: `INFO`

## Development Notes

- When adding Python dependencies (e.g., `python-pptx`), rebuild containers:
  ```bash
  docker-compose up --build
  ```
- Local `venv/` is for development only and excluded from Docker builds
- All file paths use forward slashes (`/`) for cross-platform compatibility

# How to test backend
İf you have some changes in backend, you need to run these commands:

```bash
cd backend
.\venv\Scripts\activate
$env:PYTHONPATH="."; python -m pytest
bandit -r . --exclude ./venv -s B101
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv
```
Some changes need to change test files. Dont forget.
