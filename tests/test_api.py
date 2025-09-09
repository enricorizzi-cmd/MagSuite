from pathlib import Path

from magsuite import MagSuite


def test_total_quantity(inventory_path):
    app = MagSuite(str(inventory_path))
    assert app.total_quantity() == 15
