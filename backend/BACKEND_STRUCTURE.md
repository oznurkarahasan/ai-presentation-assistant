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
│       ├── auth.py ................ Authentication endpoints (register/login/me + forgot/reset password)
│       ├── chat.py ................ Chat and RAG endpoints handling conversational requests
│       └── presentations.py ....... Upload endpoints and ingestion orchestration for PDF/PPTX
│
├── core/
│   ├── config.py .................. Pydantic Settings (ENV, logging, JWT, DB, CORS, SMTP, password-reset settings)
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
    ├── email_service.py ........... SMTP email sender for password-reset messages and reset-link generation
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
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` - Password reset token lifetime (minutes), default: `60`
- `FRONTEND_URL` - Frontend base URL used in reset links, default: `http://localhost:3000`
- `SMTP_HOST` - SMTP server hostname (required to actually send email)
- `SMTP_PORT` - SMTP server port (for Gmail usually `587`)
- `SMTP_USER` - SMTP username/login
- `SMTP_PASSWORD` - SMTP password/app password
- `SMTP_FROM_EMAIL` - Sender email address shown in password-reset emails
- `SMTP_FROM_NAME` - Sender display name shown in password-reset emails

## Password Reset Mail Flow

- `POST /api/v1/auth/forgot-password`
  - Accepts an email and returns a generic success response.
  - If the user exists, generates a short-lived JWT reset token and queues email sending via FastAPI `BackgroundTasks`.
  - Uses `app/services/email_service.py` to send the reset link.
- `POST /api/v1/auth/reset-password`
  - Validates reset token, finds the user, hashes the new password, and updates the stored password hash.

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
bandit -r . -s B101,B105 --exclude ./venv
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv
```
Some changes need to change test files. Dont forget.

### For ubuntu
```bash
cd backend
source venv/bin/activate
$env:PYTHONPATH="."; python -m pytest
bandit -r . -s B101,B105 --exclude ./venv
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv

#for one test
$env:PYTHONPATH="."; python -m pytest tests/test_stt_service.py -v
```