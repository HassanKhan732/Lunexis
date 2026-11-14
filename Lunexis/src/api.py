from flask import Flask, jsonify

from src.data.catalog import list_items
from src.services.reporting import build_report


def health() -> dict:
    return {"status": "ok", "items": list_items()}


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health_route():
        return jsonify(health())

    @app.get("/reports")
    def reports_route():
        return jsonify(build_report())

    return app
