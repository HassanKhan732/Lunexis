from src.api import health


def get_health() -> dict:
    return health()
