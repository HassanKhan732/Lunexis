from src.config import APP_ENV, APP_NAME
from src.services.bootstrap import bootstrap_application
from src.services.health import get_health


def test_get_health_returns_catalog() -> None:
    payload = get_health()

    assert payload["status"] == "ok"
    assert payload["items"] == ["overview", "status", "operations", "reports"]


def test_bootstrap_uses_configured_application_values() -> None:
    payload = bootstrap_application()

    assert payload == {
        "name": APP_NAME,
        "environment": APP_ENV,
        "status": "initialized",
    }