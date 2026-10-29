import os
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    
    # Cross-Hospital Sharing Governance - Disabled by default for single-facility isolation
    ENABLE_CROSS_HOSPITAL_SHARING: bool = os.getenv("ENABLE_CROSS_HOSPITAL_SHARING", "false").lower() in ("true", "1", "yes")
    
    # Document & PII Encryption Configuration (Envelope Encryption with AES-256-GCM)
    DOC_ENCRYPTION_KEY: str = os.getenv("DOC_ENCRYPTION_KEY", "")
    DOC_ENCRYPTION_KEY_ID: str = os.getenv("DOC_ENCRYPTION_KEY_ID", "kek-v1")
    KMS_PROVIDER: str = os.getenv("KMS_PROVIDER", "local")  # 'local', 'mock_cloud_kms', 'aws_kms'
    KMS_KEY_ARN: str = os.getenv("KMS_KEY_ARN", "")

    # Application-Layer API Request/Response Payload Encryption (AES-256-GCM + ECDH)
    PAYLOAD_ENCRYPTION_ENABLED: bool = os.getenv("PAYLOAD_ENCRYPTION_ENABLED", "true").lower() in ("true", "1", "yes")
    PAYLOAD_ENCRYPTION_STRICT: bool = os.getenv("PAYLOAD_ENCRYPTION_STRICT", "false").lower() in ("true", "1", "yes")
    PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS: int = int(os.getenv("PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS", "3600"))
    PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW: int = int(os.getenv("PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW", "60"))
    PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE: int = int(os.getenv("PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE", str(10 * 1024 * 1024)))

    # Distributed Redis & Rate Limiting Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "false").lower() in ("true", "1", "yes")
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_FAIL_POLICY: str = os.getenv("RATE_LIMIT_FAIL_POLICY", "strict")  # 'strict' (fail-closed on critical) or 'lenient'

    # Anti-Malware Scanning Configuration (ClamAV / ICAP)
    CLAMAV_HOST: str = os.getenv("CLAMAV_HOST", "127.0.0.1")
    CLAMAV_PORT: int = int(os.getenv("CLAMAV_PORT", "3310"))
    CLAMAV_ENABLED: bool = os.getenv("CLAMAV_ENABLED", "false").lower() in ("true", "1", "yes")
    MALWARE_SCAN_FAIL_POLICY: str = os.getenv("MALWARE_SCAN_FAIL_POLICY", "fail_closed")  # 'fail_closed' or 'fail_open'
    
    # Email / SMTP Infrastructure Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@ohid.online")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "OneHealth ID Security")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    SUPER_ADMIN_SUPPORT_EMAIL: str = os.getenv("SUPER_ADMIN_SUPPORT_EMAIL", "security-support@ohid.online")
    TESTING_EMAIL_BACKEND: bool = os.getenv("TESTING_EMAIL_BACKEND", "true").lower() in ("true", "1", "yes")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://ohid.online")

    # WhatsApp Business API / Dispatcher Configuration
    WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    TESTING_WHATSAPP_BACKEND: bool = os.getenv("TESTING_WHATSAPP_BACKEND", "true").lower() in ("true", "1", "yes")
    
    # CORS - Explicit origin allowlist (Strictly forbids '*' wildcard with credentials)
    CORS_ORIGINS: List[str] = [
        "https://ohid.online",
        "http://ohid.online",
        "https://www.ohid.online",
        "http://www.ohid.online",
        "http://localhost:3040",
        "http://127.0.0.1:3040",
        "http://localhost:3050",
        "http://127.0.0.1:3050",
        "http://localhost:8050",
        "http://127.0.0.1:8050",
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

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or "default-secret" in self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise RuntimeError("FATAL SECURITY MISCONFIGURATION: SECRET_KEY must be explicitly set to a cryptographically secure random value in production.")
            if self.REDIS_ENABLED and not self.REDIS_URL.startswith("rediss://"):
                raise RuntimeError("FATAL SECURITY MISCONFIGURATION: In production, Redis must use TLS encryption with the 'rediss://' URI scheme.")
        return self

settings = Settings()

