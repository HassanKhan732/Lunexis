from src.data.catalog import list_items


def test_list_items() -> None:
    items = list_items()
    assert items[0] == "overview"
    assert len(items) >= 4
