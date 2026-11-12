from src.data.catalog import list_items


def health() -> dict:
    return {"status": "ok", "items": list_items()}
