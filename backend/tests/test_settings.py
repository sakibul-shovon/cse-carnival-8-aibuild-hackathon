from pathlib import Path

from sqlalchemy import create_engine, text

from app.main import _run_migrations
from app.settings import BACKEND_ROOT, REPOSITORY_ROOT, Settings


def test_env_files_are_anchored_to_the_repository() -> None:
    env_files = Settings.model_config["env_file"]

    assert env_files == (REPOSITORY_ROOT / ".env", BACKEND_ROOT / ".env")
    assert all(Path(path).is_absolute() for path in env_files)


def test_migrations_commit_revision_and_can_run_twice(tmp_path: Path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'restart.db').as_posix()}"

    _run_migrations(database_url)
    _run_migrations(database_url)

    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            revision = connection.scalar(text("SELECT version_num FROM alembic_version"))
    finally:
        engine.dispose()

    assert revision == "7cd073c14135"
