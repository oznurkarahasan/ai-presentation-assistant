### Project Roadmap & Status

## Phase 1: Infrastructure & Architecture

- [x] Docker environment setup (FastAPI, Next.js, Postgres).
- [x] Database Schema Design (7 Tables, 3NF Normalized).
- [x] Vector Database integration (`pgvector` setup).
- [x] Cascade Delete & Integrity Rules implementation.
- [x] Guest User vs Registered User logic definition.

## Phase 2: Authentication

- [ ] Pydantic Schemas (Register/Login validation).
- [ ] Password Hashing (bcrypt).
- [ ] JWT Token generation & handling.
- [ ] Login/Register API Endpoints.
- [ ] Current User dependency injection.

## Phase 3: File Ingestion

- [ ] PDF & PPTX Parsing Logic.
- [ ] File Upload API Endpoint.
- [ ] Text Extraction & Cleaning.
- [ ] Vector Embedding Generation (OpenAI).
- [ ] Saving to Database (Slides + Vectors).

## Phase 4: Core AI Services

- [ ] RAG Engine (Semantic Search).
- [ ] Presentation Analysis Service (GPT-4o).
- [ ] Real-time Speech-to-Text (Whisper).
- [ ] Auto-Slide Switching Logic.

## Phase 5: Frontend Integration

- [ ] Authentication Pages (Login/Register).
- [ ] Dashboard & Library.
- [ ] Upload & Progress Bar.
- [ ] Live Presentation Mode (WebSocket).

## Phase 6: Optimization & Polish

- [ ] Guest Data Cleanup (Cron Job).
- [ ] Error Handling & Logging.
- [ ] Deployment Configuration.

## Phase 7: Performance Optimization (Future)

- [ ] Replace Python-based audio processing with C++ Microservice.
- [ ] Implement local inference using `whisper.cpp` for zero-latency slide switching.
