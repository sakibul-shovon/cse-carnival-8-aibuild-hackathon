from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./campusos.db"
    demo_user_id: str = "usr-001"
    app_timezone: str = "Asia/Dhaka"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])
    run_migrations: bool = True
    seed_database: bool = True
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    agent_timeout_seconds: float = 20.0
    agent_max_rounds: int = 6
