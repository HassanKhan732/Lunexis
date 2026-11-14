# Lunexis

Lunexis is an experimental project focused on building a clean, maintainable workflow for fast iteration and deployment.

## Goals
- Keep the project easy to understand
- Make feature work visible through commit history
- Provide a simple foundation for future expansion

## Setup
Install the application and test dependencies with `python -m pip install -r requirements-dev.txt`. Copy `.env.example` to `.env` to customize local settings.

## Run
Start the API with `python -m src.app`. It listens on `127.0.0.1:5000` by default. `HOST`, `PORT`, `APP_NAME`, `APP_ENV`, and `LOG_LEVEL` can be set in `.env` or the process environment. Process environment values take precedence.

- `GET /health` returns the application health and catalog items.
- `GET /reports` returns the current report payload.

## Test
Run the test suite with `python -m pytest -q`.
