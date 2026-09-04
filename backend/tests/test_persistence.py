from pathlib import Path
from datetime import date

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError

from app.db.ids import new_id
from app.db.models import Announcement, Assignment, Booking, Enrollment, Event, Registration, Room, Schedule, User
from app.db.seed import import_seed_data
from app.db.session import create_engine_and_session_factory, session_scope


@pytest.fixture
def database(tmp_path: Path):
    database_path = tmp_path / "campusos.db"
    url = f"sqlite:///{database_path.as_posix()}"
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine, factory = create_engine_and_session_factory(url)
    try:
        yield engine, factory
    finally:
        engine.dispose()


def test_migration_and_seed_import_all_supplied_data(database):
    engine, factory = database
    with session_scope(factory) as session:
        assert import_seed_data(session) is True

    with session_scope(factory) as session:
        assert session.scalar(select(func.count()).select_from(User)) == 1
        assert session.scalar(select(func.count()).select_from(Enrollment)) == 11
        assert session.scalar(select(func.count()).select_from(Schedule)) == 24
        assert session.scalar(select(func.count()).select_from(Room)) == 20
        assert session.scalar(select(func.count()).select_from(Booking)) == 3
        assert session.scalar(select(func.count()).select_from(Event)) == 7
        assert session.scalar(select(func.count()).select_from(Registration)) == 9
        assert session.scalar(select(func.count()).select_from(Announcement)) == 8
        assert session.scalar(select(func.count()).select_from(Assignment)) == 8
        assert session.scalar(select(Event.registered).where(Event.id == "evt-001")) == 47

    with engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one() == 1


def test_restart_does_not_reseed_or_overwrite_changes(database):
    engine, factory = database
    with session_scope(factory) as session:
        import_seed_data(session)
    with session_scope(factory) as session:
        session.get(Room, "room-001").capacity = 99

    engine.dispose()
    restarted_engine, restarted_factory = create_engine_and_session_factory(str(engine.url))
    try:
        with session_scope(restarted_factory) as session:
            assert import_seed_data(session) is False
            assert session.get(Room, "room-001").capacity == 99
    finally:
        restarted_engine.dispose()


def test_committed_mutation_survives_new_session(database):
    _, factory = database
    with session_scope(factory) as session:
        import_seed_data(session)
        session.add(Announcement(id=new_id("ann"), title="Persistent", body="Saved", date=date(2026, 9, 4), priority="low", posted_by="Test", expires=date(2026, 9, 5)))
    with session_scope(factory) as session:
        assert session.scalar(select(func.count()).select_from(Announcement).where(Announcement.title == "Persistent")) == 1


def test_failed_transaction_rolls_back_all_writes(database):
    _, factory = database
    with pytest.raises(IntegrityError):
        with session_scope(factory) as session:
            session.add(Room(id="room-new", room_number="X101", type="classroom", capacity=10, floor=1, status="available"))
            session.add(Room(id="room-duplicate", room_number="X101", type="classroom", capacity=10, floor=1, status="available"))
    with session_scope(factory) as session:
        assert session.scalar(select(func.count()).select_from(Room).where(Room.room_number == "X101")) == 0


def test_database_constraints_protect_relations_and_capacity(database):
    _, factory = database
    with session_scope(factory) as session:
        import_seed_data(session)
    with pytest.raises(IntegrityError):
        with session_scope(factory) as session:
            session.add(Registration(event_id="evt-001", student_id="20-40532", name="Duplicate"))
    with pytest.raises(IntegrityError):
        with session_scope(factory) as session:
            session.get(Event, "evt-001").registered = 61


def test_generated_ids_are_prefixed_and_unique():
    values = {new_id("bk") for _ in range(100)}
    assert len(values) == 100
    assert all(value.startswith("bk-") and len(value) == 35 for value in values)
