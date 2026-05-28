# QA Guide: Backend, Frontend, and General Tests

This file describes the standard test and quality checks for this repo.

## Backend tests (Linux/macOS)

```bash
cd backend
source venv/bin/activate
PYTHONPATH="." python -m pytest
bandit -r . -s B101,B105 --exclude ./venv
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv
```

Run a single backend test file:

```bash
cd backend
source venv/bin/activate
PYTHONPATH="." python -m pytest tests/test_orchestration.py -v
```

## Backend tests (Windows PowerShell)

```powershell
cd backend
.\venv\Scripts\Activate
$env:PYTHONPATH = "."
python -m pytest
bandit -r . -s B101,B105 --exclude ./venv
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv
```

## Frontend tests

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm audit --omit=dev --audit-level=high
npm run test
```

If you change a page, update related tests (example: login page changes may require updating
`frontend/tests/login.test.tsx`).

## General checks (full repo)

Run both backend and frontend checks in sequence:

```bash
cd backend
source venv/bin/activate
PYTHONPATH="." python -m pytest

cd ../frontend
npm run lint
npm run test
```

Optional CI parity checks (when applicable):

- Backend security scan: `bandit -r backend -s B101,B105 --exclude backend/venv`
- Backend lint: `flake8 backend --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=backend/venv`