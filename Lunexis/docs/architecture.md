# Architecture

Lunexis is a small Flask application organized into configuration, API, service, domain, and data layers.

## Request flow
- `src.app` configures logging and starts the local server.
- `src.api` creates the Flask app and maps HTTP routes to services.
- `src.services.health` and `src.services.reporting` build response payloads.
- `src.data.catalog` owns the current in-memory catalog.

## Application startup
`src.config` loads settings from the process environment and then `.env` values that are not already set. Defaults bind the development server to `127.0.0.1:5000`.

`src.services.bootstrap` creates the initial `ProjectContext`. The current catalog and report are in-memory examples; persistence, authentication, deployment, and production server configuration are outside this foundation's scope.

## Validation
The test suite uses Flask's test client for route behavior and unit tests for service and bootstrap behavior. Install development dependencies from `requirements-dev.txt` and run `python -m pytest -q`.
