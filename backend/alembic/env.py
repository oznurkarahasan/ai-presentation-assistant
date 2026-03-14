from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _bootstrap_app_settings_env() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        fallback = config.get_main_option("sqlalchemy.url")
        if fallback and fallback.startswith("postgresql+psycopg2://"):
            fallback = fallback.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        if fallback:
            os.environ["DATABASE_URL"] = fallback

    # Needed only because app Settings validates this at import time.
    os.environ.setdefault("OPENAI_API_KEY", "alembic-placeholder-key")


_bootstrap_app_settings_env()

from app.core.database import Base  # noqa: E402
from app.models import presentation  # noqa: F401, E402


def _build_sync_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return config.get_main_option("sqlalchemy.url")
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return database_url


config.set_main_option("sqlalchemy.url", _build_sync_database_url())
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
