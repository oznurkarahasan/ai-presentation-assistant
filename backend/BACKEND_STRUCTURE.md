# Project: Backend Directory Structure

Terminal-style ASCII tree showing the `backend/` folder structure with one-line descriptions.

```bash
backend/
├── Dockerfile ..................... Docker build instructions for backend service image
├── main.py ........................ FastAPI application entrypoint and startup hooks
├── requirements.txt ............... Python dependency list
├── pytest.ini ..................... Pytest configuration
├── BACKEND_STRUCTURE.md ........... Backend structure + test notes
├── app/ ........................... Main backend application package
│   ├── __init__.py ................ Package marker
│   ├── api/
│   │   ├── __init__.py ............ API package marker
│   │   └── v1/
│   │       ├── __init__.py ........ API v1 package marker
│   │       ├── auth.py ............ Authentication endpoints (register/login/me + password reset)
│   │       ├── chat.py ............ Chat endpoints
│   │       ├── orchestration.py ... Presentation session/orchestration endpoints
│   │       └── presentations.py ... Presentation upload/list/detail/delete endpoints
│   ├── core/
│   │   ├── __init__.py ............ Core package marker
│   │   ├── config.py .............. Settings management
│   │   ├── database.py ............ Async SQLAlchemy engine/session setup
│   │   ├── exceptions.py .......... Custom exception classes/handlers
│   │   ├── logger.py .............. Logging setup
│   │   └── security.py ............ Password hashing and JWT helpers
│   ├── models/
│   │   ├── __init__.py ............ Models package marker
│   │   └── presentation.py ........ ORM models (User, Presentation, Slide, sessions)
│   ├── schemas/
│   │   ├── __init__.py ............ Schemas package marker
│   │   ├── auth.py ................ Auth request/response schemas
│   │   └── chat.py ................ Chat request schemas
│   └── services/
│       ├── __init__.py ............ Services package marker
│       ├── email_service.py ....... SMTP email sender
│       ├── embedding_service.py ... Embedding generation wrapper
│       ├── file_cleanup.py ........ Upload cleanup helpers
│       ├── file_validator.py ...... File type/size/security checks
│       ├── intent_service.py ...... Intent parsing/classification
│       ├── pdf_service.py ......... PDF extraction + orientation/aspect ratio
│       ├── pptx_service.py ........ PPTX extraction + orientation/aspect ratio
│       ├── rag_service.py ......... RAG orchestration helpers
│       └── vector_db.py ........... Vector/metadata persistence operations
├── scripts/
│   └── test_smtp.py ............... SMTP connectivity test script
├── tests/
│   ├── conftest.py ................ Shared test fixtures
│   ├── test_auth.py ............... Auth endpoint tests
│   ├── test_intent_service.py ..... Intent service tests
│   └── test_orchestration.py ...... Orchestration tests
├── logs/ .......................... Runtime log files (local/dev)
├── uploaded_files/ ................ Persisted uploaded presentation files
└── venv/ .......................... Local virtual environment (development only)
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
If you have some changes in backend, you need to run these commands:

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
$env:PYTHONPATH="."; python -m pytest tests/test_orchestration.py -v
```
