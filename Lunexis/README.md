# Lunexis

Lunexis is an experimental project focused on building a clean, maintainable workflow for fast iteration and deployment.

## Goals
- Keep the project easy to understand
- Make feature work visible through commit history
- Provide a simple foundation for future expansion

## Run
Start the local API with `python -m src.app`. It listens on `127.0.0.1:5000` by default; set `PORT` to use another port.

- `GET /health` returns the application health and catalog items.
- `GET /reports` returns the current report payload.
