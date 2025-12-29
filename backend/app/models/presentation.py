from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Text, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    presentations = relationship("Presentation", back_populates="owner", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("PresentationSession", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan") 

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    ideal_presentation_time = Column(Integer, default=10)
    language = Column(String, default="tr")
    notifications_enabled = Column(Boolean, default=True)

    user = relationship("User", back_populates="preferences")

class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    session_id = Column(String, nullable=True, index=True) 
    
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="presentations")
    slides = relationship("Slide", back_populates="presentation", cascade="all, delete-orphan")
    analysis = relationship("PresentationAnalysis", back_populates="presentation", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("PresentationSession", back_populates="presentation", cascade="all, delete-orphan")

class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id"))
    page_number = Column(Integer, nullable=False)
    content_text = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    
    # RAG Embedding
    embedding = Column(Vector(1536)) 

    presentation = relationship("Presentation", back_populates="slides")
    notes = relationship("Note", back_populates="slide", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    slide_id = Column(Integer, ForeignKey("slides.id"))
    content = Column(String(1000), nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="notes")
    slide = relationship("Slide", back_populates="notes")

class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"

    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id"), unique=True)
    overall_score = Column(Float, default=0.0)
    content_json = Column(JSON, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    presentation = relationship("Presentation", back_populates="analysis")

class PresentationSession(Base):
    __tablename__ = "presentation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    session_id = Column(String, nullable=True, index=True)

    presentation_id = Column(Integer, ForeignKey("presentations.id"))
    session_type = Column(String, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    metrics_json = Column(JSON, nullable=True)

    user = relationship("User", back_populates="sessions")
    presentation = relationship("Presentation", back_populates="sessions")