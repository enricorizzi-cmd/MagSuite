import sys
from pathlib import Path
import pytest

# Ensure project root is on sys.path for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def inventory_path() -> Path:
    return PROJECT_ROOT / "docs" / "sample_inventory.csv"
