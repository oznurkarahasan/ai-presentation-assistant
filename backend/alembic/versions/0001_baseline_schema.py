"""baseline schema

Revision ID: 0001_baseline_schema
Revises:
Create Date: 2026-02-28 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = "0001_baseline_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


token_type_enum = sa.Enum(
    "email_verify",
    "password_reset",
    "api_key",
    "refresh_token",
    name="token_type_enum", create_type=False,
)
activity_action_enum = sa.Enum(
    "login",
    "logout",
    "register",
    "password_reset_request",
    "password_reset_complete",
    "email_verified",
    "presentation_uploaded",
    "presentation_deleted",
    "presentation_updated",
    "presentation_analyzed",
    "session_started",
    "session_ended",
    "note_created",
    "note_updated",
    "note_deleted",
    name="activity_action_enum", create_type=False,
)
file_type_enum = sa.Enum("pdf", "pptx", name="file_type_enum", create_type=False)
presentation_status_enum = sa.Enum("uploaded", "analyzing", "completed", "failed", name="presentation_status_enum", create_type=False)
session_type_enum = sa.Enum("rehearsal", "live", name="session_type_enum", create_type=False)
storage_tier_enum = sa.Enum("standard", "archived", name="storage_tier_enum", create_type=False)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    bind = op.get_bind()
    token_type_enum.create(bind, checkfirst=True)
    activity_action_enum.create(bind, checkfirst=True)
    file_type_enum.create(bind, checkfirst=True)
    presentation_status_enum.create(bind, checkfirst=True)
    session_type_enum.create(bind, checkfirst=True)
    storage_tier_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=True),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("profile_picture_url", sa.String(length=500), nullable=True),
        sa.Column("timezone", sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_active_verified", "users", ["is_active", "email_verified"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_is_active"), "users", ["is_active"], unique=False)

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", activity_action_enum, nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("log_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_log_action_created", "activity_logs", ["action", "created_at"], unique=False)
    op.create_index("ix_log_entity", "activity_logs", ["entity_type", "entity_id"], unique=False)
    op.create_index("ix_log_user_created", "activity_logs", ["user_id", "created_at"], unique=False)
    op.create_index(op.f("ix_activity_logs_action"), "activity_logs", ["action"], unique=False)
    op.create_index(op.f("ix_activity_logs_created_at"), "activity_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_activity_logs_id"), "activity_logs", ["id"], unique=False)
    op.create_index(op.f("ix_activity_logs_user_id"), "activity_logs", ["user_id"], unique=False)

    op.create_table(
        "presentations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("file_type", file_type_enum, nullable=False),
        sa.Column("file_path", sa.String(length=4096), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("thumbnail_path", sa.String(), nullable=True),
        sa.Column("slide_count", sa.Integer(), nullable=True),
        sa.Column("total_words", sa.Integer(), nullable=True),
        sa.Column("status", presentation_status_enum, nullable=True),
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_guest_upload", sa.Boolean(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("storage_tier", storage_tier_enum, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_presentation_guest_expires", "presentations", ["is_guest_upload", "expires_at"], unique=False)
    op.create_index("ix_presentation_status_created", "presentations", ["status", "created_at"], unique=False)
    op.create_index("ix_presentation_user_created", "presentations", ["user_id", "created_at"], unique=False)
    op.create_index(op.f("ix_presentations_expires_at"), "presentations", ["expires_at"], unique=False)
    op.create_index(op.f("ix_presentations_id"), "presentations", ["id"], unique=False)
    op.create_index(op.f("ix_presentations_is_guest_upload"), "presentations", ["is_guest_upload"], unique=False)
    op.create_index(op.f("ix_presentations_status"), "presentations", ["status"], unique=False)
    op.create_index(op.f("ix_presentations_user_id"), "presentations", ["user_id"], unique=False)

    op.create_table(
        "presentation_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("presentation_id", sa.Integer(), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("readability_score", sa.Float(), nullable=True),
        sa.Column("structure_score", sa.Float(), nullable=True),
        sa.Column("visual_balance_score", sa.Float(), nullable=True),
        sa.Column("content_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("analysis_version", sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(["presentation_id"], ["presentations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("presentation_id"),
    )
    op.create_index(op.f("ix_presentation_analyses_id"), "presentation_analyses", ["id"], unique=False)

    op.create_table(
        "presentation_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_uuid", sa.String(length=36), nullable=False),
        sa.Column("presentation_id", sa.Integer(), nullable=True),
        sa.Column("metrics_json", sa.JSON(), nullable=True),
        sa.Column("session_type", session_type_enum, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("current_slide_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["presentation_id"], ["presentations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_session_type_started", "presentation_sessions", ["session_type", "started_at"], unique=False)
    op.create_index(op.f("ix_presentation_sessions_id"), "presentation_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_presentation_sessions_presentation_id"), "presentation_sessions", ["presentation_id"], unique=False)
    op.create_index(op.f("ix_presentation_sessions_session_type"), "presentation_sessions", ["session_type"], unique=False)
    op.create_index(op.f("ix_presentation_sessions_session_uuid"), "presentation_sessions", ["session_uuid"], unique=True)
    op.create_index(op.f("ix_presentation_sessions_started_at"), "presentation_sessions", ["started_at"], unique=False)
    op.create_index(op.f("ix_presentation_sessions_user_id"), "presentation_sessions", ["user_id"], unique=False)

    op.create_table(
        "slides",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("presentation_id", sa.Integer(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["presentation_id"], ["presentations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("presentation_id", "page_number", name="uq_presentation_page"),
    )
    op.create_index(
        "ix_slide_embedding",
        "slides",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.create_index(op.f("ix_slides_id"), "slides", ["id"], unique=False)
    op.create_index(op.f("ix_slides_presentation_id"), "slides", ["presentation_id"], unique=False)

    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("slide_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["slide_id"], ["slides.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_note_user_slide", "notes", ["user_id", "slide_id"], unique=False)
    op.create_index(op.f("ix_notes_id"), "notes", ["id"], unique=False)
    op.create_index(op.f("ix_notes_user_id"), "notes", ["user_id"], unique=False)

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("ideal_presentation_time", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=10), nullable=True),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=True),
        sa.Column("email_notifications", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_user_preferences_id"), "user_preferences", ["id"], unique=False)

    op.create_table(
        "verification_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column("token_type", token_type_enum, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_token_type_expires", "verification_tokens", ["token_type", "expires_at"], unique=False)
    op.create_index("ix_token_user_type", "verification_tokens", ["user_id", "token_type"], unique=False)
    op.create_index(op.f("ix_verification_tokens_expires_at"), "verification_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_verification_tokens_id"), "verification_tokens", ["id"], unique=False)
    op.create_index(op.f("ix_verification_tokens_token"), "verification_tokens", ["token"], unique=True)
    op.create_index(op.f("ix_verification_tokens_token_type"), "verification_tokens", ["token_type"], unique=False)
    op.create_index(op.f("ix_verification_tokens_user_id"), "verification_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_verification_tokens_user_id"), table_name="verification_tokens")
    op.drop_index(op.f("ix_verification_tokens_token_type"), table_name="verification_tokens")
    op.drop_index(op.f("ix_verification_tokens_token"), table_name="verification_tokens")
    op.drop_index(op.f("ix_verification_tokens_id"), table_name="verification_tokens")
    op.drop_index(op.f("ix_verification_tokens_expires_at"), table_name="verification_tokens")
    op.drop_index("ix_token_user_type", table_name="verification_tokens")
    op.drop_index("ix_token_type_expires", table_name="verification_tokens")
    op.drop_table("verification_tokens")

    op.drop_index(op.f("ix_user_preferences_id"), table_name="user_preferences")
    op.drop_table("user_preferences")

    op.drop_index(op.f("ix_notes_user_id"), table_name="notes")
    op.drop_index(op.f("ix_notes_id"), table_name="notes")
    op.drop_index("ix_note_user_slide", table_name="notes")
    op.drop_table("notes")

    op.drop_index(op.f("ix_slides_presentation_id"), table_name="slides")
    op.drop_index(op.f("ix_slides_id"), table_name="slides")
    op.drop_index("ix_slide_embedding", table_name="slides")
    op.drop_table("slides")

    op.drop_index(op.f("ix_presentation_sessions_user_id"), table_name="presentation_sessions")
    op.drop_index(op.f("ix_presentation_sessions_started_at"), table_name="presentation_sessions")
    op.drop_index(op.f("ix_presentation_sessions_session_uuid"), table_name="presentation_sessions")
    op.drop_index(op.f("ix_presentation_sessions_session_type"), table_name="presentation_sessions")
    op.drop_index(op.f("ix_presentation_sessions_presentation_id"), table_name="presentation_sessions")
    op.drop_index(op.f("ix_presentation_sessions_id"), table_name="presentation_sessions")
    op.drop_index("ix_session_type_started", table_name="presentation_sessions")
    op.drop_table("presentation_sessions")

    op.drop_index(op.f("ix_presentation_analyses_id"), table_name="presentation_analyses")
    op.drop_table("presentation_analyses")

    op.drop_index(op.f("ix_presentations_user_id"), table_name="presentations")
    op.drop_index(op.f("ix_presentations_status"), table_name="presentations")
    op.drop_index(op.f("ix_presentations_is_guest_upload"), table_name="presentations")
    op.drop_index(op.f("ix_presentations_id"), table_name="presentations")
    op.drop_index(op.f("ix_presentations_expires_at"), table_name="presentations")
    op.drop_index("ix_presentation_user_created", table_name="presentations")
    op.drop_index("ix_presentation_status_created", table_name="presentations")
    op.drop_index("ix_presentation_guest_expires", table_name="presentations")
    op.drop_table("presentations")

    op.drop_index(op.f("ix_activity_logs_user_id"), table_name="activity_logs")
    op.drop_index(op.f("ix_activity_logs_id"), table_name="activity_logs")
    op.drop_index(op.f("ix_activity_logs_created_at"), table_name="activity_logs")
    op.drop_index(op.f("ix_activity_logs_action"), table_name="activity_logs")
    op.drop_index("ix_log_user_created", table_name="activity_logs")
    op.drop_index("ix_log_entity", table_name="activity_logs")
    op.drop_index("ix_log_action_created", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_index(op.f("ix_users_is_active"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index("ix_user_active_verified", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    storage_tier_enum.drop(bind, checkfirst=True)
    session_type_enum.drop(bind, checkfirst=True)
    presentation_status_enum.drop(bind, checkfirst=True)
    file_type_enum.drop(bind, checkfirst=True)
    activity_action_enum.drop(bind, checkfirst=True)
    token_type_enum.drop(bind, checkfirst=True)
