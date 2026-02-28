# Project Roadmap & Status (Updated: 2026-02-28)

This file is maintained as a living backlog. Phases are updated based on the current codebase status.

## Phase 1: Infrastructure & Core Architecture (Completed)

- [x] Docker environment (FastAPI + Next.js + PostgreSQL + pgvector) is set up.
- [x] Async SQLAlchemy foundation and core model structure are implemented.
- [x] `pgvector` extension integration is completed.
- [x] Initial migration/schema baseline is in place.
- [x] Environment-based configuration (`.env`, config management) is completed.
- [x] Database init and extension checks are added at application startup.

## Phase 2: Authentication & Account Flows (Mostly Completed)

- [x] Register / Login / Me endpoints are completed.
- [x] JWT-based authentication and dependency chain are completed.
- [x] Password hashing and verification (bcrypt) are completed.
- [x] Forgot password + reset password backend flow is completed.
- [x] Forgot/Reset password frontend pages are completed.
- [x] SMTP-based reset email delivery is integrated.
- [ ] Email verification flow (token verification endpoint + UI) is missing.
- [ ] Refresh token and session invalidation strategy is missing.

## Phase 3: File Ingestion & Security (Completed, Guest Side Pending)

- [x] PDF and PPTX upload support is completed.
- [x] Magic-bytes validation is added to prevent file type spoofing.
- [x] File size limit (50MB) and empty file checks are added.
- [x] PDF/PPTX extraction and text sanitization are completed.
- [x] SHA256 hash generation and upload metadata persistence are completed.
- [x] Embedding generation is optimized with batch/concurrent processing.
- [x] Presentation + slide + vector persistence flow is completed.
- [x] File cleanup flow for failure scenarios is added.
- [ ] Guest upload lifecycle (permission model + data retention policy) needs to be finalized.

## Phase 4: AI/RAG & Real-Time Orchestration (In Progress)

- [x] RAG-based Q&A endpoint (`/api/v1/chat/{presentation_id}`) is active.
- [x] Semantic retrieval + OpenAI-based response generation is active.
- [x] Real-time orchestration WebSocket endpoint is active.
- [x] Intent-driven slide commands are active (`NEXT/PREV/JUMP`).
- [x] Real-time presentation frontend page is active.
- [x] Analyze -> Real-Time navigation link is added.
- [ ] Prompt/heuristic tuning for better intent accuracy is pending.
- [ ] Multi-language intent stability and edge-case tests are pending.
- [ ] Whisper/local STT alternative (beyond Web Speech fallback) is pending.

## Phase 5: Frontend Product Flows (Mostly Completed)

- [x] Auth screens (login/register/forgot/reset) are completed.
- [x] Upload page with drag-drop, progress, and error states is completed.
- [x] Dashboard, library, and session history screens are present.
- [x] Analyze screen and chat experience are active.
- [x] Real-time mode UI is active.
- [ ] Small-screen/mobile optimization (especially dashboard/live mode) needs improvement.
- [ ] Design token standardization for UI consistency is missing at component level.

## Phase 6: Testing, CI/CD & Quality Gates (In Progress)

- [x] Backend test foundation (`pytest`, `pytest-asyncio`) is set up.
- [x] Frontend unit test foundation (`Vitest`) is set up.
- [x] Baseline tests for auth and orchestration are implemented.
- [x] Backend quality workflow (`backend-check.yml`) is active.
- [x] Frontend quality workflow (`frontend-preview.yml`) is active.
- [x] Docker build validation workflow (`ci-cd.yml`) is active.
- [ ] Backend + frontend test coverage for forgot/reset flow should be expanded.
- [ ] End-to-end integration test coverage for upload flow (PDF + PPTX) should be expanded.
- [ ] A real E2E pipeline (Playwright/Cypress) is not available yet.

## Phase 7: Reliability, Observability & Ops (Planned)

- [ ] Structured logging standard (request-id/correlation-id) should be expanded.
- [ ] Centralized metrics collection (Prometheus/Grafana or equivalent) should be implemented.
- [ ] Error tracking integration (Sentry or equivalent) should be implemented.
- [ ] Health-check/readiness and operational runbooks should be expanded.
- [ ] Backup/restore and disaster recovery procedures should be documented.

## Phase 8: Production Hardening & Security (Planned)

- [ ] Distributed rate limiting (Redis or gateway layer) should be implemented.
- [ ] IP-based abuse protection for guest users should be added.
- [ ] Malware/content scanning (e.g., ClamAV) should be evaluated.
- [ ] CORS/secret/cookie policies should be hardened for production.
- [ ] Security testing (SAST/DAST + dependency policy) should be expanded.

## Phase 9: Performance & Scale (Future)

- [ ] Migrate large file storage to object storage (S3/Azure Blob).
- [ ] Implement CDN + signed URL strategy.
- [ ] Scale embedding pipeline with a queue-based worker architecture.
- [ ] Optimize real-time latency (STT + intent + command loop).
- [ ] Build a feasibility prototype for `whisper.cpp` / C++ microservice.

## Current Sprint Priorities (Next)

- [ ] Finalize backend contract for guest mode (token, permissions, cleanup durations).
- [ ] Increase test coverage for forgot/reset flow (backend + frontend).
- [ ] Add stronger integration tests for upload flow (PDF/PPTX + failure scenarios).
- [ ] Define baseline metrics for real-time intent accuracy.
