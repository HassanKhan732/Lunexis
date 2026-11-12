from src.core.models import ProjectContext


def build_context(name: str, environment: str) -> ProjectContext:
    return ProjectContext(name=name, environment=environment, status="initialized")
