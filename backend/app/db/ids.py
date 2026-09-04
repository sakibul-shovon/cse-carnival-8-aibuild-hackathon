from uuid import uuid4


def new_id(prefix: str) -> str:
    """Return a collision-resistant, contract-compatible resource ID."""
    return f"{prefix}-{uuid4().hex}"
