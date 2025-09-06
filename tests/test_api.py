from pathlib import Path
from magsuite import MagSuite

def test_total_quantity():
    inventory = Path(__file__).resolve().parent.parent / "docs" / "sample_inventory.csv"
    app = MagSuite(str(inventory))
    assert app.total_quantity() == 15
