from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    cors_allow_origins: str = Field(default="*", alias="CORS_ALLOW_ORIGINS")

    impala_host: str = Field(
        default="",
        validation_alias=AliasChoices("IMPALA_HOST"),
    )
    impala_port: int = Field(
        default=443,
        validation_alias=AliasChoices("IMPALA_PORT"),
    )
    impala_http_path: str = Field(
        default="",
        validation_alias=AliasChoices("IMPALA_HTTP_PATH"),
    )
    impala_db: str = Field(
        default="cai_sdx_se_indonesia",
        validation_alias=AliasChoices("DB_NAME", "IMPALA_DB"),
    )
    impala_user: str = Field(
        default="",
        validation_alias=AliasChoices("CDP_USER", "IMPALA_USER"),
    )
    impala_password: str = Field(
        default="",
        validation_alias=AliasChoices("CDP_PASS", "IMPALA_PASSWORD"),
    )

    azure_openai_endpoint: str = Field(
        default="",
        validation_alias=AliasChoices("AZURE_OPENAI_ENDPOINT"),
    )
    azure_openai_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("AZURE_OPENAI_API_KEY"),
    )
    azure_openai_api_version: str = Field(
        default="",
        validation_alias=AliasChoices("AZURE_OPENAI_API_VERSION"),
    )
    azure_openai_deployment: str = Field(
        default="",
        validation_alias=AliasChoices("AZURE_OPENAI_DEPLOYMENT"),
    )
    azure_openai_model: str = Field(
        default="",
        validation_alias=AliasChoices("AZURE_OPENAI_MODEL"),
    )
    session_backend: str = Field(default="sqlite", alias="SESSION_BACKEND")
    session_sqlite_path: str = Field(
        default="data/ask_data_sessions.db",
        alias="SESSION_SQLITE_PATH",
    )
    session_ttl_minutes: int = Field(default=30, alias="SESSION_TTL_MINUTES")
    memory_max_history: int = Field(default=10, alias="MEMORY_MAX_HISTORY")
    sql_default_limit: int = Field(default=100, alias="SQL_DEFAULT_LIMIT")
    sql_max_preview_rows: int = Field(default=100, alias="SQL_MAX_PREVIEW_ROWS")
    sql_allowed_tables: str = Field(
        default="customers,deposits,credits,fraud_transactions",
        alias="SQL_ALLOWED_TABLES",
    )
    rag_base_url: str = Field(
        default="",
        validation_alias=AliasChoices("RAG_BASE_URL", "AGENT_BASE_URL"),
    )
    rag_timeout_seconds: int = Field(default=60, alias="RAG_TIMEOUT_SECONDS")
    guardrails_enabled: bool = Field(default=False, alias="GUARDRAILS_ENABLED")
    guardrails_api_key: str = Field(default="", alias="GUARDRAILS_API_KEY")
    guardrails_base_url: str = Field(default="", alias="GUARDRAILS_BASE_URL")
    guardrails_fail_open: bool = Field(default=True, alias="GUARDRAILS_FAIL_OPEN")

    @property
    def is_impala_configured(self) -> bool:
        required_values = (
            self.impala_host,
            self.impala_http_path,
            self.impala_db,
            self.impala_user,
            self.impala_password,
        )
        return all(bool(value) for value in required_values)

    @property
    def is_azure_openai_configured(self) -> bool:
        required_values = (
            self.azure_openai_endpoint,
            self.azure_openai_api_key,
            self.azure_openai_api_version,
            self.azure_openai_deployment,
            self.azure_openai_model,
        )
        return all(bool(value) for value in required_values)

    @property
    def sql_allowed_tables_list(self) -> list[str]:
        return [
            table.strip().lower()
            for table in self.sql_allowed_tables.split(",")
            if table.strip()
        ]

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allow_origins.split(",")
            if origin.strip()
        ] or ["*"]

    @property
    def is_rag_configured(self) -> bool:
        return bool(self.rag_base_url.strip())

    @property
    def is_guardrails_configured(self) -> bool:
        return self.guardrails_enabled and bool(self.guardrails_api_key.strip())

    @property
    def guardrails_mode(self) -> str:
        if not self.guardrails_enabled:
            return "disabled"
        if self.guardrails_base_url.strip():
            return "remote"
        if self.guardrails_api_key.strip():
            return "local-only"
        return "misconfigured"


@lru_cache
def get_settings() -> Settings:
    return Settings()
