from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
# Application settings for the AI Presentation Assistant
    PROJECT_NAME: str = "AI Presentation Assistant"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    DATABASE_URL: str = "postgresql+asyncpg://admin:admin@presentation_db:5432/presentation_db"
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()