import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text  

from app.core.config import settings
from app.core.database import engine, Base
from app.core.logger import logger
from app.core.exceptions import (
    AppBaseException,
    FileProcessingError,
    PDFExtractionError,
    EmbeddingError,
    DatabaseError,
    ResourceNotFoundError,
    ValidationError
)
from app.api.v1 import auth, presentations, chat, speech

# Lifespan event to create tables and extensions
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup initiated")
    logger.info(
        f"Deepgram enabled: {bool(settings.DEEPGRAM_API_KEY)} | "
        f"model={settings.DEEPGRAM_MODEL} | lang={settings.DEEPGRAM_LANGUAGE}"
    )
    if not os.getenv("TESTING"):
        async with engine.begin() as conn:
            # Ensure the vector extension is created
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    else:
        logger.info("Skipping database initialization in TESTING mode")
    yield
    logger.info("Application shutdown")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Global Exception Handlers
@app.exception_handler(AppBaseException)
async def custom_exception_handler(request: Request, exc: AppBaseException):
    """Handle custom application exceptions"""
    logger.error(f"Custom Exception: {exc.message} | Details: {exc.details}")
    status_code = getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST)
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message}
    )

@app.exception_handler(FileProcessingError)
async def file_processing_error_handler(request: Request, exc: FileProcessingError):
    """Handle file processing errors"""
    logger.error(f"File Processing Error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "File processing failed. Please check the file format and try again."}
    )

@app.exception_handler(PDFExtractionError)
async def pdf_extraction_error_handler(request: Request, exc: PDFExtractionError):
    """Handle PDF extraction errors"""
    logger.error(f"PDF Extraction Error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Failed to extract text from PDF. The file may be corrupted or password-protected."}
    )

@app.exception_handler(EmbeddingError)
async def embedding_error_handler(request: Request, exc: EmbeddingError):
    """Handle embedding generation errors"""
    logger.error(f"Embedding Error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "AI service temporarily unavailable. Please try again later."}
    )

@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    """Handle database errors"""
    logger.critical(f"Database Error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error occurred. Our team has been notified."}
    )

@app.exception_handler(ResourceNotFoundError)
async def not_found_error_handler(request: Request, exc: ResourceNotFoundError):
    """Handle resource not found errors"""
    logger.warning(f"Resource Not Found: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message}
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation Error: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled exceptions"""
    logger.critical(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Our team has been notified."}
    )

app.add_middleware(
    # CORS settings - configurable via CORS_ORIGINS environment variable
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Can be configured via .env file
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
if not os.path.exists("uploaded_files"):
    os.makedirs("uploaded_files")
app.mount("/uploaded_files", StaticFiles(directory="uploaded_files"), name="uploaded_files")

app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["Authentication"]) # Authentication routes modules seperated
app.include_router(presentations.router, prefix=settings.API_V1_STR + "/presentations", tags=["Presentations"])
app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["Chat"])
app.include_router(speech.router, prefix=settings.API_V1_STR)
@app.get("/")
async def root():
    return {"message": "AI Presentation Assistant API is running successfully."}