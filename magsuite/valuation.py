from __future__ import annotations

"""Inventory valuation algorithms and configuration helpers."""

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class Batch:
    """A purchase batch used for valuation calculations."""

    quantity: int
    unit_cost: float


def fifo(batches: List[Batch], quantity: int) -> float:
    """Return cost of goods sold for ``quantity`` using FIFO."""
    remaining = quantity
    cost = 0.0
    for batch in batches:
        if remaining <= 0:
            break
        used = min(batch.quantity, remaining)
        cost += used * batch.unit_cost
        remaining -= used
    if remaining > 0:
        raise ValueError("Not enough inventory")
    return cost


def lifo(batches: List[Batch], quantity: int) -> float:
    """Return cost of goods sold for ``quantity`` using LIFO."""
    remaining = quantity
    cost = 0.0
    for batch in reversed(batches):
        if remaining <= 0:
            break
        used = min(batch.quantity, remaining)
        cost += used * batch.unit_cost
        remaining -= used
    if remaining > 0:
        raise ValueError("Not enough inventory")
    return cost


def weighted_average(batches: List[Batch], quantity: int) -> float:
    """Return cost of goods sold using weighted average cost."""
    total_qty = sum(b.quantity for b in batches)
    if quantity > total_qty:
        raise ValueError("Not enough inventory")
    total_cost = sum(b.quantity * b.unit_cost for b in batches)
    average_cost = total_cost / total_qty if total_qty else 0
    return quantity * average_cost


@dataclass
class ValuationConfig:
    """Configuration mapping valuation methods to companies or warehouses."""

    company_methods: Dict[str, str]
    warehouse_methods: Dict[str, str]

    def get_method(
        self,
        *,
        company: str | None = None,
        warehouse: str | None = None,
        default: str = "fifo",
    ) -> str:
        """Return valuation method for ``company`` or ``warehouse``."""
        if warehouse and warehouse in self.warehouse_methods:
            return self.warehouse_methods[warehouse]
        if company and company in self.company_methods:
            return self.company_methods[company]
        return default
