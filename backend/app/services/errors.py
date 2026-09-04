class ServiceError(Exception):
    code = "CONFLICT"

    def __init__(self, message: str, **details: object) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or None


class NotFoundError(ServiceError):
    code = "NOT_FOUND"


class ConflictError(ServiceError):
    code = "CONFLICT"


class ForbiddenError(ServiceError):
    code = "FORBIDDEN"


class RoomUnavailableError(ConflictError):
    code = "ROOM_UNAVAILABLE"


class EventFullError(ConflictError):
    code = "EVENT_FULL"


class AlreadyRegisteredError(ConflictError):
    code = "ALREADY_REGISTERED"


class NotRegisteredError(ServiceError):
    code = "NOT_REGISTERED"


class AgentUnavailableError(ServiceError):
    code = "AGENT_UNAVAILABLE"
