from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    # Resolve configuration independently of the process working directory.
    # The repository-level file is the documented default; a backend-local file
    # can override it for deployments that package this directory on its own.
    model_config = SettingsConfigDict(
        env_file=(REPOSITORY_ROOT / ".env", BACKEND_ROOT / ".env"),
        extra="ignore",
    )

    database_url: str = "sqlite:///./campusos.db"
    demo_user_id: str = "usr-001"
    app_timezone: str = "Asia/Dhaka"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])
    run_migrations: bool = True
    seed_database: bool = True
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.6-flash"
    agent_timeout_seconds: float = 20.0
    agent_max_rounds: int = 6
