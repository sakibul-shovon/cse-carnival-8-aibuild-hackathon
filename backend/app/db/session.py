from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker


def create_engine_and_session_factory(database_url: str) -> tuple[Engine, sessionmaker[Session]]:
    engine = create_engine(database_url)

    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        @event.listens_for(engine, "begin")
        def begin_immediate(connection) -> None:
            # Serialize writers before a service checks state, closing the usual
            # SQLite check-then-insert race for bookings and registrations.
            connection.exec_driver_sql("BEGIN IMMEDIATE")

    return engine, sessionmaker(bind=engine, expire_on_commit=False)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session(factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    """FastAPI-compatible dependency with one transaction per request."""
    with session_scope(factory) as session:
        yield session
