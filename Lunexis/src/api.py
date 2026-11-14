from flask import Flask, jsonify

from src.services.health import get_health
from src.services.reporting import build_report


def health() -> dict:
    return get_health()


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health_route():
        return jsonify(get_health())

    @app.get("/reports")
    def reports_route():
        return jsonify(build_report())

    return app
