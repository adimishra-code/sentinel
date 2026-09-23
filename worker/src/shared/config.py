"""
Shared configuration for Sentinel Worker
Reads from environment variables
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Service
    worker_port: int = 8000
    log_level: str = "info"

    # MongoDB
    mongo_uri: str = "mongodb://admin:changeme@localhost:27017/sentinel?authSource=admin"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # AI
    gemini_api_key: str = ""
    model_name: str = "gemini-2.0-flash-exp"
    model_provider: str = "gemini"

    # Backend (for internal calls if needed)
    backend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
