import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "OneHealth ID (OH-ID) Enterprise Hospital Operating System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database URL - strictly read from environment with no credential literals
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_SCHEMA: str = os.getenv("DB_SCHEMA", "oh_id")
    
    # Security - Cryptographic secret key for signing tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "oh-id-enterprise-production-default-secret-key-at-least-32-chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS - Explicit origin allowlist (Strictly forbids '*' wildcard with credentials)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8008",
        "http://127.0.0.1:8008",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
