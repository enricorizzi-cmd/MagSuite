"""Minimal MagSuite package with filtering and export helpers."""

from dataclasses import dataclass
import csv
import json
from pathlib import Path
from typing import List, Optional, Dict

from openpyxl import Workbook

@dataclass
class Item:
    """A single inventory record."""

    name: str
    warehouse: str
    lot: str
    quantity: int

class MagSuite:
    """Load and summarise simple inventory CSV files.

    The CSV file must contain ``name``, ``warehouse``, ``lot`` and ``quantity`` columns.
    """

    def __init__(self, inventory_path: str):
        self.inventory_path = inventory_path

    # ------------------------------------------------------------------
    # Loading and filtering
    def load_inventory(self) -> List[Item]:
        """Load inventory data from ``self.inventory_path``."""
        with open(self.inventory_path, newline="") as fh:
            reader = csv.DictReader(fh)
            return [
                Item(
                    row["name"],
                    row.get("warehouse", ""),
                    row.get("lot", ""),
                    int(row["quantity"]),
                )
                for row in reader
            ]

    def row_view(
        self,
        name: Optional[str] = None,
        warehouse: Optional[str] = None,
        lot: Optional[str] = None,
    ) -> List[Item]:
        """Return inventory rows filtered by the provided fields."""

        items = self.load_inventory()
        if name:
            items = [i for i in items if i.name == name]
        if warehouse:
            items = [i for i in items if i.warehouse == warehouse]
        if lot:
            items = [i for i in items if i.lot == lot]
        return items

    def total_quantity(self, items: Optional[List[Item]] = None) -> int:
        """Return the total quantity for all ``items`` (or entire inventory)."""

        items = self.load_inventory() if items is None else items
        return sum(item.quantity for item in items)

    # ------------------------------------------------------------------
    # Saved views
    def _views_path(self) -> Path:
        return Path(self.inventory_path).with_suffix(".views.json")

    def save_view(self, name: str, filters: Dict[str, Optional[str]]) -> None:
        """Persist ``filters`` under ``name``."""

        path = self._views_path()
        data: Dict[str, Dict[str, Optional[str]]]
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        else:
            data = {}
        data[name] = filters
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh)

    def load_view(self, name: str) -> Dict[str, Optional[str]]:
        """Return filters stored under ``name``."""

        path = self._views_path()
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data.get(name, {})

    # ------------------------------------------------------------------
    # Export helpers
    def export(self, items: List[Item], destination: Path) -> None:
        """Export ``items`` to ``destination`` (CSV or XLSX)."""

        dest = Path(destination)
        if dest.suffix.lower() == ".csv":
            with open(dest, "w", newline="", encoding="utf-8") as fh:
                writer = csv.writer(fh)
                writer.writerow(["name", "warehouse", "lot", "quantity"])
                for i in items:
                    writer.writerow([i.name, i.warehouse, i.lot, i.quantity])
        elif dest.suffix.lower() in {".xlsx"}:
            wb = Workbook()
            ws = wb.active
            ws.append(["name", "warehouse", "lot", "quantity"])
            for i in items:
                ws.append([i.name, i.warehouse, i.lot, i.quantity])
            wb.save(dest)
        else:
            raise ValueError("Unsupported export format")
