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
