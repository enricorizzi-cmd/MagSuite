-- Add indexes for stock movement queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_wh_lot_serial ON stock_movements(item_id, warehouse_id, lot_id, serial_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot ON stock_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_wh_moved_at ON stock_movements(warehouse_id, moved_at);
