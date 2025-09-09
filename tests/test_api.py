from pathlib import Path

from magsuite import MagSuite


def inventory_path() -> Path:
    return Path(__file__).resolve().parent.parent / "docs" / "sample_inventory.csv"


def test_total_quantity():
    app = MagSuite(str(inventory_path()))
    assert app.total_quantity() == 15
