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

## Import API

The backend accepts CSV or XLSX files with `name` and `quantity` columns:

```csv
name,quantity
widget,10
gadget,5
```

Upload a file and create a log entry:

```bash
curl -F file=@docs/sample_inventory.csv http://localhost:3000/imports/items
```

## Label API

Generate a PDF label using a template:

```bash
curl "http://localhost:3000/labels/standard?text=Widget" -o label.pdf
```
