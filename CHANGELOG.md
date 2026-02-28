# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog.

## [Unreleased]

### Added

- End-to-end password reset flow:
  - Backend endpoints: `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
  - SMTP-based reset email service integration
  - Frontend pages for forgot/reset password flow
- Real-time orchestration mode for presentations:
  - WebSocket endpoint: `/api/v1/orchestration/ws/presentation/{presentation_id}`
  - Client-side speech capture via Web Speech API
  - Intent-driven slide navigation (`NEXT_SLIDE`, `PREVIOUS_SLIDE`, `JUMP_TO_SLIDE`)
- Real-time presentation UI page: `frontend/app/presentation/[id]/page.tsx`
- Orchestration test coverage for WebSocket connection, transcript broadcast, intent command flow, and jump behavior
- Frontend preview quality workflow: `.github/workflows/frontend-preview.yml`
- Project license file (`LICENSE`)

### Changed

- Analyze page now links directly to Real-Time Mode (`/presentation/{id}`)
- Presentation details response now includes `total_pages` for frontend compatibility
- CI workflow naming/file alignment updated in documentation and repository:
  - Backend quality: `.github/workflows/backend-check.yml`
  - Main CI (Docker build validation): `.github/workflows/ci-cd.yml`

### Existing Capabilities (Current Baseline)

- Upload and process both PDF and PPTX files
- Magic-bytes file validation and file-size limits (50 MB)
- PDF/PPTX security checks (including encrypted PDF detection)
- Batched embedding generation with OpenAI
- pgvector-based semantic search (RAG)
- JWT-based authentication (`register`, `login`, `me`)
- Global exception handling and centralized logging
- Async backend tests (`pytest`, `pytest-asyncio`) and frontend unit tests (`Vitest`)

## [0.1.0] - Initial Release

### Added

- FastAPI backend with async SQLAlchemy
- PostgreSQL with pgvector integration
- PDF upload and extraction pipeline
- OpenAI embedding integration
- JWT authentication
- Baseline RAG flow
- Docker and Docker Compose setup
