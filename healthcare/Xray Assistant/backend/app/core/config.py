from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    app_name: str = "Xray Assistant API"
    app_version: str = "0.1.0"
    environment: str = "development"
    xray_model_path: str | None = None
    xray_confidence_threshold: float = 0.25
    xray_response_language: str = "en"
    genai_provider: str = "fallback"
    aws_default_region: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    bedrock_model_id: str | None = None
    bedrock_timeout_seconds: int = 20
    backend_root: Path = BACKEND_ROOT

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
