# AI-Powered Presentation Assistant

An intelligent system that analyzes real-time speech during presentations to automatically navigate slides, powered by Edge AI logic and a modern web stack.

## System Architecture

This project utilizes a decoupled microservice architecture orchestrated via Docker Compose.

| Service      | Technology            | Host Port (Local) | Container Port (Docker) | Description                                                    |
| :----------- | :-------------------- | :---------------- | :---------------------- | :------------------------------------------------------------- |
| **Backend**  | Python (FastAPI)      | `8000`            | `8000`                  | Handles AI logic, RAG pipeline, and WebSocket connections.     |
| **Frontend** | Next.js (React)       | `3000`            | `3000`                  | User interface for uploading presentations and live mode.      |
| **Database** | PostgreSQL + pgvector | `5435`            | `5432`                  | Stores user data and vector embeddings for AI semantic search. |

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

### 4. Local Development Setup (For Coding & IntelliSense)

To fix missing imports in VS Code and enable auto-completion:

1.  **Navigate to backend:**
    ```bash
    cd backend
    ```
2.  **Create Virtual Environment:**
    ```bash
    python -m venv venv
    ```
3.  **Activate Environment:**
    - **Windows:** `.\venv\Scripts\activate`
    - **Mac/Linux:** `source venv/bin/activate`
4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **VS Code Configuration:**
    - Press `Ctrl + Shift + P` -> `Python: Select Interpreter`
    - Select the interpreter inside `./backend/venv/Scripts/python.exe`

### 5. Access Points

Once the system is running, you can access:

    Frontend (UI): http://localhost:3000

    Backend API: http://localhost:8000

    API Documentation (Swagger): http://localhost:8000/docs

    Database: Connect via any SQL client (DBeaver, TablePlus) using localhost:5432 (User/Pass: admin/admin).

### 6. Development Workflow

When should I run --build?
Only if you modify:

- backend/requirements.txt (Adding new Python libraries)
- frontend/package.json (Adding new Node packages)
- Dockerfile or docker-compose.yml

Important: if you add new python libraries please dont forget to add to requirements.txt

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

### 7. Database Schema (PostgreSQL + pgvector)

The system relies on a **9-Table Relational Structure** designed for data integrity, AI compatibility, and comprehensive audit logging.

| Table Name                  | Description                           | Key Features                                                                      |
| :-------------------------- | :------------------------------------ | :-------------------------------------------------------------------------------- |
| **`users`**                 | Central identity table.               | Supports Age Analysis (`birth_date`). Root of all relations.                      |
| **`user_preferences`**      | User-specific settings.               | Stores `ideal_presentation_time`, `language`. (1:1 Relation).                     |
| **`presentations`**         | Metadata for uploaded files.          | Supports **Guest Mode** (`user_id` nullable). PDF/PPTX with file hash & security. |
| **`slides`**                | The "Brain" of the RAG system.        | Stores **Vector Embeddings (1536 dim)** for AI semantic search via pgvector.      |
| **`notes`**                 | User-specific slide notes.            | Strictly for registered users (`user_id` NOT null).                               |
| **`presentation_analyses`** | AI-generated report card.             | JSON-based storage for flexible AI metrics and feedback.                          |
| **`presentation_sessions`** | Performance logs.                     | Tracks `practice` vs `live` sessions and duration.                                |
| **`activity_logs`**         | System-wide audit trail.              | Logs all user actions (upload, delete, login) for security and analytics.         |
| **`verification_tokens`**   | Email verification & password resets. | Time-limited tokens for secure user authentication flows.                         |

> **Security Note:** All relationships utilize `CASCADE DELETE`. If a user is deleted, all their data (slides, notes, sessions, logs) is automatically wiped to prevent orphan data.

### Shortcuts

- To access the database via Docker

```bash
docker exec -it presentation_db psql -U admin -d presentation_db
```

- To delete and reinstall in Docker

```bash
docker-compose down
docker-compose up -d
```

- Docker commands

```bash
docker-compose up --build
docker system prune -a --volumes
docker compose build
```

- Pyhton virtual environment

```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

## Commands for Linux Users

- Builds images and starts all services in the background.

```bash
docker compose up -d --build
```
- Starts existing containers without rebuilding images.
```bash
docker compose up -d
```
- Stops and removes containers and the project network.
```bash
docker compose down
```
- watch logs
```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```
- only one service
```bash
docker compose up -d --build backend
docker compose up -d --build frontend
```
- in container
```bash
docker compose exec backend bash
docker compose exec frontend sh
```
- delete volumes, db container. all data will be deleted
```bash
docker compose down -v
```
- Pyhton virtual environment
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```
