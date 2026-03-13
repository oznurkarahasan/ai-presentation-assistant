# Alembic Database Migration System Guide

This document outlines the workflow and best practices for managing database migrations using Alembic in our project.

## The General Workflow

When working with database models, any schema changes must be translated into migration files. This ensures that the database structure remains consistent across all environments (development, staging, production) and across the team.

### 1. Making a Database Change (You or your Teammate)

Let's say you want to add a new column `is_premium` (Boolean) to the `User` table.

1. **Update the SQLAlchemy Model:** 
   First, modify the corresponding model file in your code (e.g., `app/models/presentation.py`).
   ```python
   is_premium = Column(Boolean, default=False)
   ```

2. **Generate a Migration Script:**
   With your virtual environment (`venv`) active, run the following command in the terminal to let Alembic automatically detect the changes and create a migration file:
   ```bash
   alembic revision --autogenerate -m "add_is_premium_to_users_table"
   ```
   *This compares your SQLAlchemy models against the current state of your database and creates a new Python file in the `alembic/versions/` directory.*

3. **Review the Migration File (CRUCIAL):**
   Always open the newly created file in `alembic/versions/` and inspect the `upgrade()` and `downgrade()` functions. Ensure that Alembic only added the `is_premium` column and hasn't accidentally dropped or altered other tables/columns you didn't intend to touch.

4. **Apply the Changes Locally:**
   Upgrade your local database to apply the new schema:
   ```bash
   alembic upgrade head
   ```

5. **Commit and Push:**
   Commit both your code changes (models) and the **newly generated migration script** to your Git repository, then push.

---

### 2. Syncing Changes from Teammates

When a teammate has made database changes and merged them, you need to pull their code and update your local database.

1. **Pull the Latest Code:**
   ```bash
   git pull origin main
   ```

2. **Update Your Database:**
   Apply the migrations your teammate created to your own local database:
   ```bash
   alembic upgrade head
   ```

---

### 3. Production / CI/CD Deployment

When deploying to a production or staging environment, applying database migrations must happen *before* the application server (e.g., FastAPI/Uvicorn) starts handling requests.

The typical deployment flow:
1. Pull the latest code on the server (`git pull`).
2. Run database migrations immediately:
   ```bash
   alembic upgrade head
   ```
3. Start or restart the application server.

*(Note: We use GitHub Actions to automate and verify that these migrations can run successfully without error before deployment).*

---

### 4. Handling Conflicts (Multiple Heads)

If you and a teammate both create a migration script independently at the same time and merge them, Alembic will throw a **"Multiple heads"** error because it doesn't know which migration comes first (they both point to the same preceding ID).

**How to resolve this:**
1. Manually edit one of the conflicting files to change its `down_revision` value to point to the other migration's revision ID (creating a single chain).
2. Alternatively, use Alembic's built-in command to merge heads automatically:
   ```bash
   alembic merge heads -m "merge_multiple_heads"
   ```
   Then run `alembic upgrade head` again.

## 5. Common Commands

| Command | Description |
|---------|-------------|
| `alembic revision --autogenerate -m "message"` | Generates a new migration script based on changes in your SQLAlchemy models. |
| `alembic upgrade head` | Applies all pending migrations to the database. |
| `alembic downgrade -1` | Reverts the last applied migration. |
| `alembic check` | Verifies that your migrations are valid and can be applied/reverted correctly. |
| `alembic merge heads -m "message"` | Merges multiple migration heads into a single new migration. |

