from magsuite.receiving import (
    POLine,
    select_po_line,
    assign_lot,
    create_receipt,
    check_delivery,
    generate_label,
)


def test_select_and_assign_lot():
    lines = [POLine(1, "widget", 10, "A"), POLine(2, "gadget", 5, "B")]
    line = select_po_line(lines, 1)
    assert line.item_name == "widget"
    lot_scanned = assign_lot(line, "ABC123")
    assert lot_scanned == "ABC123"
    generated = assign_lot(line)
    assert len(generated) == 8
    assert generated != lot_scanned


def test_create_receipt_updates_inventory():
    inventory = {}
    line = POLine(1, "widget", 10, "A")
    lot = assign_lot(line, "LOT1")
    create_receipt(inventory, line, lot, 7)
    assert inventory[("widget", "A", "LOT1")] == 7


def test_create_receipt_accumulates_inventory():
    inventory = {}
    line = POLine(1, "widget", 10, "A")
    lot = assign_lot(line, "LOT1")
    create_receipt(inventory, line, lot, 3)
    create_receipt(inventory, line, lot, 2)
    assert inventory[("widget", "A", "LOT1")] == 5


def test_check_delivery_and_label():
    line = POLine(1, "widget", 10, "A")
    status_over = check_delivery(line, 12)
    status_under = check_delivery(line, 8)
    status_exact = check_delivery(line, 10)
    assert status_over == ("over", 2)
    assert status_under == ("under", 2)
    assert status_exact == ("exact", 0)
    label = generate_label(line, "LOT1", 5)
    assert "widget" in label and "LOT1" in label and "5" in label

