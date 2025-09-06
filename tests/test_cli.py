from pathlib import Path
import subprocess
import sys

def test_cli_reports_total():
    inventory = Path(__file__).resolve().parent.parent / "docs" / "sample_inventory.csv"
    result = subprocess.run(
        [sys.executable, "-m", "magsuite", "--inventory", str(inventory)],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Total quantity: 15" in result.stdout
