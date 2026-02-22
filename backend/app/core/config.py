from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Presentation Assistant"
    API_V1_STR: str = "/api/v1"
    
    # Environment: development, staging, production
    ENV: str = "development"
    
    # Logging configuration
    ENABLE_LOGGING: bool = True
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL

    SECRET_KEY: str = Field(
        default="CHANGE_THIS_SECRET_KEY_IN_PRODUCTION",
        description="Secret key for JWT token signing. MUST be changed in production!"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Password reset configuration
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # Frontend URL used to build password reset links
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend base URL for reset links")

    # SMTP / Email settings (used for sending password reset emails)
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str | None = None

     # STT / Whisper Configuration
    WHISPER_MODEL: str = "whisper-1"
    STT_CHUNK_DURATION_SEC: int = 4          # Target chunk duration for sliding window
    STT_OVERLAP_SEC: int = 2                  # Overlap between chunks (sliding window)
    STT_MIN_AUDIO_BYTES: int = 1000           # Minimum audio chunk size
    STT_MAX_AUDIO_BYTES: int = 26214400       # 25MB - Whisper API limit
    STT_MAX_RETRIES: int = 2                  # Retry attempts for failed transcriptions
    STT_DEFAULT_LANGUAGE: str = "auto"        # Default: auto-detect. Options: "tr", "en", "auto"

    # Slide Matching Configuration
    SLIDE_MATCH_THRESHOLD: float = 0.72       # Cosine similarity threshold for slide transition
    SLIDE_KEYWORD_BOOST: float = 0.15         # Bonus score for keyword matches

    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = 30           # WebSocket ping interval in seconds
    WS_MAX_IDLE_SECONDS: int = 300            # Max idle time before closing connection

    # CORS configuration
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins. For .env, use JSON array format: [\"http://localhost:3000\"]"
    )

    DATABASE_URL: str = Field(..., description="PostgreSQL database connection URL (e.g., postgresql+asyncpg://user:pass@localhost/dbname)")
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key for GPT-4 and embeddings (required for AI features)")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()