from sqlalchemy import (
    Column, Integer, String, ForeignKey, Date, DateTime, Text, 
    Float, Boolean, JSON, Enum, UniqueConstraint, Index, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base
import enum
from typing import Optional

class TokenType(str, enum.Enum):
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"
    API_KEY = "api_key"
    REFRESH_TOKEN = "refresh_token"
class ActivityAction(str, enum.Enum):    
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    EMAIL_VERIFIED = "email_verified"

    PRESENTATION_UPLOADED = "presentation_uploaded"
    PRESENTATION_DELETED = "presentation_deleted"
    PRESENTATION_UPDATED = "presentation_updated"
    PRESENTATION_ANALYZED = "presentation_analyzed"

    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"

    NOTE_CREATED = "note_created"
    NOTE_UPDATED = "note_updated"
    NOTE_DELETED = "note_deleted"
class PresentationStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"

class FileType(str, enum.Enum):
    PDF = "pdf"
    PPTX = "pptx"

class SessionType(str, enum.Enum):
    REHEARSAL = "rehearsal"
    LIVE = "live"

class StorageTier(str, enum.Enum):
    STANDARD = "standard"
    ARCHIVED = "archived"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    birth_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    profile_picture_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default="UTC")

    presentations = relationship("Presentation", back_populates="owner", cascade="all, delete-orphan", foreign_keys="Presentation.user_id")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("PresentationSession", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    created_presentations = relationship("Presentation", foreign_keys="Presentation.created_by", back_populates="creator")

    __table_args__ = (
        Index('ix_user_active_verified', 'is_active', 'email_verified'),
    )
class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    ideal_presentation_time = Column(Integer, default=10)
    language = Column(String(10), default="tr")
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="preferences")
class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    
    title = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    
    file_type = Column(Enum(FileType, name="file_type_enum"), nullable=False)
    
    file_path = Column(String(4096), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    file_hash = Column(String(64), nullable=True)
    thumbnail_path = Column(String, nullable=True)
    
    slide_count = Column(Integer, default=0)
    total_words = Column(Integer, default=0)
    
    status = Column(Enum(PresentationStatus, name="presentation_status_enum"), default=PresentationStatus.UPLOADED, index=True)
    
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    is_guest_upload = Column(Boolean, default=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    storage_tier = Column(Enum(StorageTier, name="storage_tier_enum"), default=StorageTier.STANDARD)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    owner = relationship("User", back_populates="presentations", foreign_keys=[user_id])
    creator = relationship("User", back_populates="created_presentations", foreign_keys=[created_by])
    
    slides = relationship("Slide", back_populates="presentation", cascade="all, delete-orphan", order_by="Slide.page_number")
    analysis = relationship("PresentationAnalysis", back_populates="presentation", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("PresentationSession", back_populates="presentation", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_presentation_status_created', 'status', 'created_at'),
        Index('ix_presentation_user_created', 'user_id', 'created_at'),
        Index('ix_presentation_guest_expires', 'is_guest_upload', 'expires_at'),
    )

class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    page_number = Column(Integer, nullable=False)
    content_text = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    embedding = Column(Vector(1536))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    presentation = relationship("Presentation", back_populates="slides")
    notes = relationship("Note", back_populates="slide", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('presentation_id', 'page_number', name='uq_presentation_page'),
        Index('ix_slide_embedding', 'embedding', postgresql_using='hnsw', postgresql_with={'m': 16, 'ef_construction': 64}, postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )
class PresentationSession(Base):
    __tablename__ = "presentation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    session_uuid = Column(String(36), unique=True, index=True, nullable=False)
    presentation_id = Column(Integer, ForeignKey("presentations.id", ondelete="CASCADE"), index=True)
    metrics_json = Column(JSON, nullable=True)

    session_type = Column(Enum(SessionType, name="session_type_enum"), nullable=False, index=True)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    current_slide_index = Column(Integer, default=1) # Added for persistent tracking
    
    user = relationship("User", back_populates="sessions")
    presentation = relationship("Presentation", back_populates="sessions")

    __table_args__ = (
        Index('ix_session_type_started', 'session_type', 'started_at'),
    )

class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id", ondelete="CASCADE"), unique=True)
    
    overall_score = Column(Float, default=0.0)
    readability_score = Column(Float, nullable=True)
    structure_score = Column(Float, nullable=True)
    visual_balance_score = Column(Float, nullable=True)
    content_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    analyzed_at = Column(DateTime(timezone=True))
    analysis_version = Column(String(20))

    presentation = relationship("Presentation", back_populates="analysis")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    slide_id = Column(Integer, ForeignKey("slides.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="notes")
    slide = relationship("Slide", back_populates="notes")
    
    __table_args__ = (
        Index('ix_note_user_slide', 'user_id', 'slide_id'),
    )

class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    token_type = Column(Enum(TokenType, name="token_type_enum"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    
    __table_args__ = (
        Index('ix_token_type_expires', 'token_type', 'expires_at'),
        Index('ix_token_user_type', 'user_id', 'token_type'),
    )

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(Enum(ActivityAction, name="activity_action_enum"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    log_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    user = relationship("User")
    
    __table_args__ = (
        Index('ix_log_user_created', 'user_id', 'created_at'),
        Index('ix_log_action_created', 'action', 'created_at'),
        Index('ix_log_entity', 'entity_type', 'entity_id'),
    )