# AI-Powered Presentation Assistant

An intelligent system that analyzes real-time speech during presentations to automatically navigate slides, powered by Edge AI logic and a modern web stack.

## System Architecture

This project utilizes a decoupled microservice architecture orchestrated via Docker Compose.

| Service      | Technology            | Internal Port | External Port | Description                                                    |
| :----------- | :-------------------- | :------------ | :------------ | :------------------------------------------------------------- |
| **Backend**  | Python (FastAPI)      | `8000`        | `8000`        | Handles AI logic, RAG pipeline, and WebSocket connections.     |
| **Frontend** | Next.js (React)       | `3000`        | `3000`        | User interface for uploading presentations and live mode.      |
| **Database** | PostgreSQL + pgvector | `5432`        | `5432`        | Stores user data and vector embeddings for AI semantic search. |

---

## Getting Started

Follow these steps to set up the project on your local machine.

### Prerequisites

- **Docker Desktop** (Must be installed and running)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/oznurkarahasan/ai-presentation-assistant.git
cd ai-presentation-assistant
```

### 2. Configure Environment Variables

Create a .env file in the root directory by copying the example.

```bash
Copy-Item .env.example .env
```

Important: Open the .env file and fill in your OPENAI_API_KEY. The database credentials can remain as default for local development.

### 3. Start the System

Run the following command to build and start all services:

```bash
docker-compose up --build
```

Wait until you see the logs "Application startup complete" and "Ready in ... ms".

### 4. Access Points

Once the system is running, you can access:

    Frontend (UI): http://localhost:3000

    Backend API: http://localhost:8000

    API Documentation (Swagger): http://localhost:8000/docs

    Database: Connect via any SQL client (DBeaver, TablePlus) using localhost:5432 (User/Pass: admin/admin).

### 5. Development Workflow

When should I run --build?
Only if you modify:

- backend/requirements.txt (Adding new Python libraries)
- frontend/package.json (Adding new Node packages)
- Dockerfile or docker-compose.yml

# if you add new python libraries please dont forget to add to requirements.txt

```bash
cd backend
pip install new_library
Add-Content requirements.txt "new_library"
```

Command to rebuild:

```bash
docker-compose up --build
```

How to stop the project?

Press Ctrl + C in the terminal, or run:

```bash
docker-compose down
```

### 6. Database Schema (PostgreSQL + pgvector)

The system relies on a **7-Table Relational Structure** designed for data integrity and AI compatibility.

| Table Name                  | Description                    | Key Features                                                        |
| :-------------------------- | :----------------------------- | :------------------------------------------------------------------ |
| **`users`**                 | Central identity table.        | Supports Age Analysis (`birth_date`). Root of all relations.        |
| **`user_preferences`**      | User-specific settings.        | Stores `ideal_presentation_time`, `language`. (1:1 Relation).       |
| **`presentations`**         | Metadata for uploaded files.   | Supports **Guest Mode** (`user_id` is nullable, uses `session_id`). |
| **`slides`**                | The "Brain" of the RAG system. | Stores **Vector Embeddings (1536 dim)** for AI search.              |
| **`notes`**                 | User-specific slide notes.     | Strictly for registered users (`user_id` NOT null).                 |
| **`presentation_analyses`** | AI-generated report card.      | JSON-based storage for flexible AI metrics.                         |
| **`presentation_sessions`** | Performance logs.              | Tracks `practice` vs `live` sessions and duration.                  |

> **Security Note:** All relationships utilize `CASCADE DELETE`. If a user is deleted, all their data (slides, notes, sessions) is automatically wiped to prevent orphan data.

### 7. Project Roadmap & Status

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
