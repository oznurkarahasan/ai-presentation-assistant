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

    # CORS configuration
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins. For .env, use JSON array format: [\"http://localhost:3000\"]"
    )

    DATABASE_URL: str = Field(..., description="PostgreSQL database connection URL (e.g., postgresql+asyncpg://user:pass@localhost/dbname)")
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key for GPT-4 and embeddings (required for AI features)")
    DEEPGRAM_API_KEY: str | None = Field(default=None, description="Deepgram API key for real-time speech recognition")
    DEEPGRAM_MODEL: str = Field(default="nova-2", description="Deepgram speech model")
    DEEPGRAM_LANGUAGE: str = Field(default="tr", description="Deepgram language code")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()