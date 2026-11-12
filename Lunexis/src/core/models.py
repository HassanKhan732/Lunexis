from dataclasses import dataclass

@dataclass
class ProjectContext:
    name: str
    environment: str
    status: str = "ready"
