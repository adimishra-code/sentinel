"""
Shared configuration for Sentinel Worker
Reads from environment variables with fail-fast validation.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service
    worker_port: int = 8000
    log_level: str = "info"

    # MongoDB (required)
    mongo_uri: str

    # Redis (required)
    redis_url: str

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # AI / Gemini
    gemini_api_key: str = ""
    model_name: str = "gemini-1.5-flash"
    model_provider: str = "gemini"

    # Backend (required for internal calls)
    backend_url: str

    # Shared secret for backend-to-worker auth (required, min 32 chars)
    worker_shared_secret: str

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Observability
    sentry_dsn: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @field_validator("mongo_uri", "redis_url", "backend_url", "worker_shared_secret")
    @classmethod
    def _require_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(f"{cls.__name__} field is required and must not be empty")
        return v.strip()

    @field_validator("worker_shared_secret")
    @classmethod
    def _validate_shared_secret_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("worker_shared_secret must be at least 32 characters long")
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()
