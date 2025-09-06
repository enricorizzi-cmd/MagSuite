"""Command line interface for MagSuite."""
import argparse
from . import MagSuite

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Summarise inventory CSV files")
    parser.add_argument("--inventory", required=True, help="Path to inventory CSV")
    return parser

def main(argv=None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    app = MagSuite(args.inventory)
    total = app.total_quantity()
    print(f"Total quantity: {total}")
