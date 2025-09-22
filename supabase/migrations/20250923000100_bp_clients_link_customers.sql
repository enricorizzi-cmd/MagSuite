ALTER TABLE bp_clients
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;

UPDATE bp_clients AS bc
SET customer_id = c.id
FROM customers AS c
WHERE bc.customer_id IS NULL
  AND bc.company_id = c.company_id
  AND lower(c.name) = lower(bc.name);

DELETE FROM bp_clients WHERE customer_id IS NULL;

ALTER TABLE bp_clients
  ALTER COLUMN customer_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bp_clients_company_customer_unique_idx
  ON bp_clients (company_id, customer_id);

CREATE INDEX IF NOT EXISTS bp_clients_customer_idx
  ON bp_clients (customer_id);
