"""
Application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # Auth - Single password authentication
    LOCUS_PASSWORD: str = "changeme"
    SECRET_KEY: str = "super-secret-key-change-in-production"

    # Database
    DATABASE_PATH: str = "./data/locus.db"

    # CORS - Frontend URL for cookie sharing
    FRONTEND_URL: str = "http://localhost:3000"

    # Server
    DEBUG: bool = False

    # Auth settings
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24


settings = Settings()
