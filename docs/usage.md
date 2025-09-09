# Usage Guide

This guide provides examples for using MagSuite.

## End-user tutorial

1. Avvia il frontend con `npm run dev` e apri l'interfaccia sul browser.
2. Cerca un articolo nella barra di ricerca per verificarne la giacenza.
3. Per un riepilogo rapido senza interfaccia grafica, usa il comando:

   ```bash
   magsuite --inventory docs/sample_inventory.csv
   ```

## Administrator tutorial

1. Importa un file di inventario:

   ```bash
   curl -F file=@docs/sample_inventory.csv http://localhost:3000/imports/items
   ```

2. Genera un'etichetta PDF per gli scaffali:

   ```bash
   curl "http://localhost:3000/labels/standard?text=Widget" -o label.pdf
   ```

3. Esegui una migrazione del database quando necessario:

   ```bash
   cd backend && npm run migrate
   ```

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

Display row view filtered by name and export to CSV:

```bash
magsuite --inventory docs/sample_inventory.csv --filter-name widget --rows --export filtered.csv
```

## Python API

```python
from magsuite import MagSuite
app = MagSuite("docs/sample_inventory.csv")
print(app.total_quantity())
```

## Import API

The backend accepts CSV or XLSX files with `name` and `quantity` columns.
Each row must include the `name`, `warehouse`, `lot` and `quantity` fields.
When importing items you can provide optional `uom` and `code` columns.
The `uom` value must be one of `pcs`, `kg` or `lb` and `code` must be
alphanumeric. Validation errors are reported in the import log and the
mapping can be customised via saved templates.

```csv
name,warehouse,lot,quantity
widget,A,L1,10
widget,B,L1,2
gadget,A,L2,3
```

Upload a file and create a log entry:

```bash
curl -F file=@docs/sample_inventory.csv http://localhost:3000/imports/items
```

## Label API

Generate a PDF label using a template and select the barcode type:

```bash
curl "http://localhost:3000/labels/standard?code=123456789012&type=ean13&format=pdf&text=Widget" \
  | jq -r '.content' | base64 -d > label.pdf
```

Generate a batch of labels in a single PDF:

```bash
curl -X POST http://localhost:3000/labels/standard/batch \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf","items":[{"code":"123456789012","type":"code128","text":"A"},{"code":"987654321098","type":"qrcode","text":"B"}]}' \
  | jq -r '.content' | base64 -d > labels.pdf
```

Request a PNG label:

```bash
curl "http://localhost:3000/labels/standard?code=123456789012&type=qrcode&format=png" \
  | jq -r '.content' | base64 -d > label.png
```
