### Project Roadmap & Status

## Phase 1: Infrastructure & Architecture

- [x] Docker environment setup (FastAPI, Next.js, Postgres).
- [x] Database Schema Design (7 Tables, 3NF Normalized).
- [x] Vector Database integration (`pgvector` setup).
- [x] Cascade Delete & Integrity Rules implementation.
- [x] Guest User vs Registered User logic definition.

## Phase 2: Authentication

- [x] Pydantic Schemas (Register/Login validation).
- [x] Password Hashing (bcrypt).
- [x] JWT Token generation & handling.
- [x] Login/Register API Endpoints.
- [x] Current User dependency injection.

## Phase 2.5: Backend Fixes

- [x] Forgot Password page & backend (JWT, email, reset endpoint).
- [ ] Guest API Endpoints.
- [ ] Guest data clean up, file upload, check guest privileges.

## Phase 3: File Ingestion

- [x] PDF & PPTX Parsing Logic.
- [x] File Upload API Endpoint.
- [x] Text Extraction & Cleaning.
- [x] Vector Embedding Generation (OpenAI).
- [x] Saving to Database (Slides + Vectors).

## Phase 4: Core AI Services

- [x] RAG Engine (Semantic Search).
- [x] Presentation Analysis Service (GPT-4o).
- [ ] Real-time Speech-to-Text (Whisper).
- [ ] Auto-Slide Switching Logic.

## Phase 4.5: CI/CD & Testing

- [x] Backend Quality Check Workflow (Flake8, Bandit, Safety)
- [x] Backend Test Suite (pytest, async fixtures)
- [x] Docker Optimization (.dockerignore)
- [x] Frontend Linting Workflow
- [x] E2E Testing Setup

## Phase 5: Frontend Integration

- [x] Authentication Pages (Login/Register).
- [ ] Dashboard & Library.
- [x] Upload & Progress Bar.
- [ ] Live Presentation Mode (WebSocket).
- [ ] Responsive UI try new fonts.

## Phase 6: Optimization & Polish

- [ ] Guest Data Cleanup (Cron Job).
- [ ] Error Handling & Logging.
- [ ] Deployment Configuration.
- [x] Backend Test Coverage
- [x] Docker Build Optimization

## Phase 7: Performance Optimization (Future)

- [ ] Replace Python-based audio processing with C++ Microservice.
- [ ] Implement local inference using `whisper.cpp` for zero-latency slide switching.

## Phase 8: Production-Ready Features (Future Implementation)

- [ ] **Redis-based Distributed Rate Limiting**
  - Dual limits: 20 uploads/hour (burst), 50 uploads/day (abuse)
  - Persistent across server restarts
  - Works with load balancers and multiple server instances
  - Configuration: `UPLOAD_RATE_LIMIT_HOURLY=20`, `UPLOAD_RATE_LIMIT_DAILY=50`
- [ ] **Alternative: Database-based Rate Limiting**
  - Simpler than Redis but with DB query overhead
  - Table: `rate_limits (user_id, count_hourly, count_daily, reset_hourly, reset_daily)`
- [ ] **Production Best Practice: API Gateway Rate Limiting**
  - Use AWS API Gateway / Azure API Management
  - Offload rate limiting to infrastructure layer
  - Better scalability and monitoring

- [ ] **Monitoring & Metrics**
  - Prometheus/Grafana integration
  - Upload success rate tracking
  - Storage usage monitoring
  - API response time metrics

- [ ] **Enhanced Security**
  - Content malware scanning (ClamAV integration)
  - XSS payload detection in PDFs
  - Rate limiting per IP (guest users)
  - CAPTCHA for suspicious activity

- [ ] **Storage Optimization**
  - Migrate to S3/Azure Blob Storage
  - CDN integration for file serving
  - Automatic tier migration (Standard → Archive after 90 days)
  - Compression for large files

> **Current Implementation Status:**
>
> [x] Authentication & User Management (JWT, bcrypt, email verification)
> [x] PDF & PPTX Upload with magic-bytes validation, security checks, and hash tracking
> [x] Vector Embeddings (OpenAI text-embedding-3-small, 1536 dimensions)
> [x] RAG System (Semantic search with pgvector, GPT-4o-mini for Q&A)
> [x] File Cleanup Policies (Failed uploads, expired guest files)
> [ ] WebSocket for Real-time Speech (Phase 4 - In Progress)
> [ ] Frontend Dashboard & Live Mode (Phase 5 - Planned)
