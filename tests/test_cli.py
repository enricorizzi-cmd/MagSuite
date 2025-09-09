from pathlib import Path
import subprocess
import sys


def inventory_path() -> Path:
    return Path(__file__).resolve().parent.parent / "docs" / "sample_inventory.csv"


def test_cli_reports_total():
    result = subprocess.run(
        [sys.executable, "-m", "magsuite", "--inventory", str(inventory_path())],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Total quantity: 15" in result.stdout


def test_cli_filters_and_export(tmp_path):
    export_path = tmp_path / "filtered.csv"
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "magsuite",
            "--inventory",
            str(inventory_path()),
            "--filter-name",
            "widget",
            "--rows",
            "--export",
            str(export_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "widget\tA\tL1\t10" in result.stdout
    assert export_path.exists()
