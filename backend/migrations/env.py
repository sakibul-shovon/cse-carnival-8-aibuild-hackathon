from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db.base import Base
from app.db import models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    # SQLAlchemy 2 rolls back an uncommitted connection on context exit. SQLite
    # keeps much of the DDL but loses Alembic's version-row insert, leaving a
    # database that crashes on every subsequent startup. Own an explicit outer
    # transaction so both schema changes and the revision marker are committed.
    with connectable.begin() as connection:
        if connection.dialect.name == "sqlite":
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
        context.run_migrations()


run_migrations_offline() if context.is_offline_mode() else run_migrations_online()
