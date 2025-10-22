
-- Add address fields to dropoff_customers table
ALTER TABLE dropoff_customers
ADD COLUMN IF NOT EXISTS mailing_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS physical_address TEXT,
ADD COLUMN IF NOT EXISTS physical_city TEXT,
ADD COLUMN IF NOT EXISTS physical_state TEXT,
ADD COLUMN IF NOT EXISTS physical_zip TEXT;

COMMENT ON COLUMN dropoff_customers.mailing_address IS 'Mailing address for the dropoff customer (generator on manifest)';
COMMENT ON COLUMN dropoff_customers.physical_address IS 'Physical address if different from mailing';
