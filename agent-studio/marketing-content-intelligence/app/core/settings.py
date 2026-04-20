from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Content Intelligence API")
    app_env: str = Field(default="dev")
    app_debug: bool = Field(default=True)
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)

    workflow_base_url: str = Field(..., alias="WORKFLOW_BASE_URL")
    workflow_api_key: str = Field(..., alias="WORKFLOW_API_KEY")

    workflow_create_session_path: str = Field(default="/api/workflow/createSession")
    workflow_kickoff_path: str = Field(default="/api/workflow/kickoff")
    workflow_events_path: str = Field(default="/api/workflow/events")
    workflow_upload_path: str = Field(default="/api/file/upload")
    workflow_list_directory_path: str = Field(default="/api/file/listDirectory")
    workflow_download_path: str = Field(default="/api/file/download")
    workflow_download_all_path: str = Field(default="/api/file/downloadAll")

    workflow_timeout_seconds: int = Field(default=120)
    polling_interval_seconds: int = Field(default=3)
    max_polling_attempts: int = Field(default=40)

    default_user_input: str = Field(default="")
    default_context: str = Field(default="")

    guardrails_enabled: bool = Field(default=False, alias="GUARDRAILS_ENABLED")
    guardrails_hub_token: str = Field(default="", alias="GUARDRAILS_HUB_TOKEN")
    guardrails_toxic_language_enabled: bool = Field(
        default=True,
        alias="GUARDRAILS_TOXIC_LANGUAGE_ENABLED",
    )
    guardrails_toxic_language_threshold: float = Field(
        default=0.5,
        alias="GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD",
    )
    guardrails_pii_enabled: bool = Field(default=True, alias="GUARDRAILS_PII_ENABLED")
    guardrails_pii_entities: str = Field(
        default="EMAIL_ADDRESS,PHONE_NUMBER,PERSON",
        alias="GUARDRAILS_PII_ENTITIES",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
