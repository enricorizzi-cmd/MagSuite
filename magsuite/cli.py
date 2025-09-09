"""Command line interface for MagSuite."""
import argparse
from pathlib import Path
from typing import Dict, Optional

from . import MagSuite


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Summarise inventory CSV files")
    parser.add_argument("--inventory", required=True, help="Path to inventory CSV")
    parser.add_argument("--filter-name", help="Filter by item name")
    parser.add_argument("--filter-warehouse", help="Filter by warehouse")
    parser.add_argument("--filter-lot", help="Filter by lot")
    parser.add_argument("--save-view", help="Save the current filters under this name")
    parser.add_argument("--view", help="Load filters saved under this name")
    parser.add_argument("--export", help="Export filtered data to the given file")
    parser.add_argument(
        "--rows", action="store_true", help="Print row view in addition to totals"
    )
    return parser


def main(argv=None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    inventory_path = Path(args.inventory)
    if not inventory_path.exists():
        parser.error("Inventory file not found")

    app = MagSuite(inventory_path)

    filters: Dict[str, Optional[str]] = {
        "name": args.filter_name,
        "warehouse": args.filter_warehouse,
        "lot": args.filter_lot,
    }

    if args.view:
        filters.update(app.load_view(args.view))

    items = app.row_view(**filters)

    if args.save_view:
        app.save_view(args.save_view, filters)

    if args.export:
        app.export(items, Path(args.export))

    if args.rows:
        for i in items:
            print(f"{i.name}\t{i.warehouse}\t{i.lot}\t{i.quantity}")

    total = app.total_quantity(items)
    print(f"Total quantity: {total}")
