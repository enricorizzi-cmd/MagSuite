from pathlib import Path
import shutil

from magsuite import MagSuite


def inventory_path() -> Path:
    return Path(__file__).resolve().parent.parent / "docs" / "sample_inventory.csv"


def test_row_view_filters():
    app = MagSuite(str(inventory_path()))
    items = app.row_view(warehouse="A")
    assert len(items) == 2
    assert {i.name for i in items} == {"widget", "gadget"}


def test_save_and_load_view(tmp_path):
    inv = tmp_path / "inv.csv"
    shutil.copy(inventory_path(), inv)
    app = MagSuite(str(inv))
    app.save_view("warehouse_a", {"warehouse": "A"})
    filters = app.load_view("warehouse_a")
    assert filters["warehouse"] == "A"


def test_export_xlsx(tmp_path):
    app = MagSuite(str(inventory_path()))
    items = app.row_view()
    out = tmp_path / "out.xlsx"
    app.export(items, out)
    assert out.exists()
