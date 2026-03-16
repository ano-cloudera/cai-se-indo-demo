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
        default="default",
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
    session_backend: str = Field(default="memory", alias="SESSION_BACKEND")
    session_ttl_minutes: int = Field(default=30, alias="SESSION_TTL_MINUTES")
    memory_max_history: int = Field(default=10, alias="MEMORY_MAX_HISTORY")
    sql_default_limit: int = Field(default=100, alias="SQL_DEFAULT_LIMIT")
    sql_max_preview_rows: int = Field(default=100, alias="SQL_MAX_PREVIEW_ROWS")
    sql_allowed_tables: str = Field(
        default="customers,deposits",
        alias="SQL_ALLOWED_TABLES",
    )

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
