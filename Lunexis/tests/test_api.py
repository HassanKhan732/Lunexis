from src.api import create_app


def test_health_endpoint() -> None:
    response = create_app().test_client().get("/health")

    assert response.status_code == 200
    assert response.json == {
        "status": "ok",
        "items": ["overview", "status", "operations", "reports"],
    }


def test_reports_endpoint() -> None:
    response = create_app().test_client().get("/reports")

    assert response.status_code == 200
    assert response.json == {
        "status": "ok",
        "items": ["overview", "status", "operations", "reports"],
    }