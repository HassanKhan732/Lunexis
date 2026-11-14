from src.data.catalog import list_items


def get_health() -> dict:
    return {"status": "ok", "items": list_items()}
