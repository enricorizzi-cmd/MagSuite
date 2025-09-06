"""Minimal MagSuite package."""

from dataclasses import dataclass
import csv
from typing import List

@dataclass
class Item:
    """A single inventory record."""
    name: str
    quantity: int

class MagSuite:
    """Load and summarise simple inventory CSV files.

    The CSV file must contain at least ``name`` and ``quantity`` columns.
    """

    def __init__(self, inventory_path: str):
        self.inventory_path = inventory_path

    def load_inventory(self) -> List[Item]:
        """Load inventory data from ``self.inventory_path``."""
        with open(self.inventory_path, newline="") as fh:
            reader = csv.DictReader(fh)
            return [Item(row["name"], int(row["quantity"])) for row in reader]

    def total_quantity(self) -> int:
        """Return the total quantity for all items."""
        return sum(item.quantity for item in self.load_inventory())
