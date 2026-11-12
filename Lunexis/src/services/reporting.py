from src.data.catalog import list_items


def build_report() -> dict:
    return {"status": "ok", "items": list_items()}
