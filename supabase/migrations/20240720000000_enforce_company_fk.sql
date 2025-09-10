-- Ensure company references are not nullable and enforce foreign keys
ALTER TABLE items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE sequences ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE causals ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_company_id_fkey'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT items_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sequences_company_id_fkey'
  ) THEN
    ALTER TABLE sequences ADD CONSTRAINT sequences_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'causals_company_id_fkey'
  ) THEN
    ALTER TABLE causals ADD CONSTRAINT causals_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
  END IF;
END $$;
