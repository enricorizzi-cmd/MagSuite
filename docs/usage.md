# Usage Guide

This guide provides examples for using MagSuite.

## Command-line

Run the CLI on an inventory CSV file:

```bash
magsuite --inventory docs/sample_inventory.csv
# or: python -m magsuite --inventory docs/sample_inventory.csv
```

Example output:

```
Total quantity: 15
```

## Python API

```python
from magsuite import MagSuite
app = MagSuite("docs/sample_inventory.csv")
print(app.total_quantity())
```
