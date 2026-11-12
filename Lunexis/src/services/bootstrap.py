from src.config import APP_NAME, APP_ENV
from src.core.pipeline import build_context


def bootstrap_application() -> dict:
    context = build_context(APP_NAME, APP_ENV)
    return {
        "name": context.name,
        "environment": context.environment,
        "status": context.status,
    }
