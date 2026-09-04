from contextlib import asynccontextmanager
from datetime import datetime

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app import api
from app.agent import AgentOrchestrator, OpenAIResponsesProvider
from app.agent.provider import ToolCallingProvider
from app.db.seed import import_seed_data
from app.db.session import create_engine_and_session_factory, get_session, session_scope
from app.services.errors import ServiceError
from app.settings import BACKEND_ROOT, Settings


ERROR_STATUS = {
    "VALIDATION_ERROR": 422,
    "NOT_FOUND": 404,
    "FORBIDDEN": 403,
    "CONFLICT": 409,
    "ROOM_UNAVAILABLE": 409,
    "EVENT_FULL": 409,
    "ALREADY_REGISTERED": 409,
    "NOT_REGISTERED": 404,
    "AGENT_UNAVAILABLE": 503,
}


def _error(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def _run_migrations(database_url: str) -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    command.upgrade(config, "head")


def create_app(settings: Settings | None = None, agent_provider: ToolCallingProvider | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.run_migrations:
            _run_migrations(settings.database_url)
        engine, factory = create_engine_and_session_factory(settings.database_url)
        app.state.engine = engine
        app.state.session_factory = factory
        if settings.seed_database:
            with session_scope(factory) as session:
                import_seed_data(session)
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(title="CampusOS API", version="1.0.0", lifespan=lifespan)
    if agent_provider is None and settings.openai_api_key:
        agent_provider = OpenAIResponsesProvider(settings.openai_api_key, settings.openai_model, settings.agent_timeout_seconds)
    app.state.agent = (AgentOrchestrator(agent_provider, settings.demo_user_id, settings.app_timezone,
                                         settings.agent_max_rounds) if agent_provider else None)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])
    api.router.demo_user_id = settings.demo_user_id
    api.router.app_timezone = settings.app_timezone

    def configured_session():
        yield from get_session(app.state.session_factory)

    app.dependency_overrides[api.db_session] = configured_session

    @app.exception_handler(ServiceError)
    async def service_error_handler(_request: Request, exc: ServiceError):
        return JSONResponse(status_code=ERROR_STATUS.get(exc.code, 409), content=_error(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content=_error("VALIDATION_ERROR", "Request validation failed", jsonable_encoder(exc.errors())))

    @app.exception_handler(ValidationError)
    async def model_validation_handler(_request: Request, exc: ValidationError):
        return JSONResponse(status_code=422, content=_error("VALIDATION_ERROR", "Validation failed", jsonable_encoder(exc.errors())))

    @app.exception_handler(IntegrityError)
    async def integrity_handler(_request: Request, _exc: IntegrityError):
        return JSONResponse(status_code=409, content=_error("CONFLICT", "The change conflicts with existing data"))

    @app.get("/health", tags=["health"])
    def health(): return {"status": "ok"}

    app.include_router(api.router)
    return app


app = create_app()
