from __future__ import annotations
"""Utilities for handling purchase order receiving."""

from dataclasses import dataclass
from typing import Iterable, Dict, Tuple, Optional
import uuid


@dataclass
class POLine:
    """A single purchase order line."""

    id: int
    item_name: str
    expected_qty: int
    warehouse: str


def select_po_line(lines: Iterable[POLine], line_id: int) -> POLine:
    """Return the PO line matching ``line_id``."""

    for line in lines:
        if line.id == line_id:
            return line
    raise ValueError("PO line not found")


def assign_lot(line: POLine, barcode: Optional[str] = None) -> str:
    """Return ``barcode`` or generate a lot identifier."""

    return barcode if barcode is not None else uuid.uuid4().hex[:8]


InventoryKey = Tuple[str, str, str]


def create_receipt(
    inventory: Dict[InventoryKey, int],
    line: POLine,
    lot: str,
    quantity: int,
) -> None:
    """Create a stock movement for ``quantity`` and update ``inventory``."""

    key = (line.item_name, line.warehouse, lot)
    inventory[key] = inventory.get(key, 0) + quantity


def check_delivery(line: POLine, received_qty: int) -> Tuple[str, int]:
    """Return delivery status (over, under, exact) and difference."""

    diff = received_qty - line.expected_qty
    if diff > 0:
        return "over", diff
    if diff < 0:
        return "under", -diff
    return "exact", 0


def generate_label(line: POLine, lot: str, quantity: int) -> str:
    """Return a printable label for the received goods."""

    return f"{line.item_name} | Lot: {lot} | Qty: {quantity}"

