import os
import pytest
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command

# The same credentials and port used in the github actions docker container
# We use psycopg2 for direct DB creation commands, asyncpg for alembic
CI_DB_URL_BASE = os.environ.get("CI_DB_URL_BASE", "postgresql+psycopg2://admin:admin@localhost:5435/postgres")
TEST_MIGRATION_DB_NAME = "test_ci_migrations"

@pytest.fixture(scope="module")
def migration_db():
    """
    Create a fresh database for testing migrations, mimicking the CI environment.
    This guarantees we catch PostgreSQL-specific errors (like Enum conflicts).
    """
    engine_default = create_engine(CI_DB_URL_BASE, isolation_level="AUTOCOMMIT")
    
    # 1. Verify Docker PostgreSQL is accessible
    try:
        with engine_default.connect() as conn:
            # Drop test db if it exists
            conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_MIGRATION_DB_NAME}"))
            # Create a fresh db
            conn.execute(text(f"CREATE DATABASE {TEST_MIGRATION_DB_NAME}"))
    except Exception as e:
        pytest.skip(f"Docker PostgreSQL not available on {CI_DB_URL_BASE}. Cannot test CI migrations locally. Error: {e}")

    # 2. Setup the target URL
    test_db_url = f"postgresql+asyncpg://admin:admin@localhost:5435/{TEST_MIGRATION_DB_NAME}"
    
    # Save original to restore later
    original_db_url = os.environ.get("DATABASE_URL")
    
    # 3. Override DATABASE_URL so Alembic picks it up instead of conftest.py defaults
    os.environ["DATABASE_URL"] = test_db_url

    yield test_db_url
    
    # 4. Cleanup DB after tests
    if original_db_url is not None:
        os.environ["DATABASE_URL"] = original_db_url
    else:
        os.environ.pop("DATABASE_URL", None)

    try:
        with engine_default.connect() as conn:
            # Disconnect other sessions first
            conn.execute(text(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{TEST_MIGRATION_DB_NAME}' AND pid <> pg_backend_pid();
            """))
            conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_MIGRATION_DB_NAME}"))
    except Exception as e:
        # Ignore cleanup errors
        pass

def test_alembic_upgrade_head(migration_db):
    """Test that applying migrations works from scratch (just like CI does)."""
    # Force DATABASE_URL to our test DB (in case other fixtures interfered)
    os.environ["DATABASE_URL"] = migration_db
    
    alembic_cfg = Config("alembic.ini")
    
    try:
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        pytest.fail(f"Alembic upgrade 'head' failed: {e}")

def test_alembic_downgrade_base(migration_db):
    """Test downgrading to base right after upgrading to head ensures types (like Enums) drop cleanly."""
    os.environ["DATABASE_URL"] = migration_db
    alembic_cfg = Config("alembic.ini")
    
    # First upgrade to head (might be already done by previous test, but let's re-run just in case)
    command.upgrade(alembic_cfg, "head")
    
    # Now try to downgrade to base
    try:
        command.downgrade(alembic_cfg, "base")
    except Exception as e:
        pytest.fail(f"Alembic downgrade 'base' failed: {e}")

def test_alembic_upgrade_head_again_after_downgrade(migration_db):
    """Test upgrading again to ensure creating Enum types doesn't cause DuplicateObject errors upon retry!"""
    os.environ["DATABASE_URL"] = migration_db
    alembic_cfg = Config("alembic.ini")
    
    try:
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        pytest.fail(f"Alembic upgrade 'head' (2nd pass) failed: {e}")
