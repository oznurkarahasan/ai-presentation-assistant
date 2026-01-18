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

    # CORS configuration
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins. For .env, use JSON array format: [\"http://localhost:3000\"]"
    )

    DATABASE_URL: str = Field(..., description="PostgreSQL database connection URL (e.g., postgresql+asyncpg://user:pass@localhost/dbname)")
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key for GPT-4 and embeddings (required for AI features)")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()