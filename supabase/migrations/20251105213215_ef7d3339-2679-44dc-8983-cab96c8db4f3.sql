-- Step 1: Add client_id to dropoffs table (temporary, will replace dropoff_customer_id)
ALTER TABLE dropoffs ADD COLUMN client_id uuid REFERENCES clients(id);

-- Step 2: Migrate all dropoff_customers to clients table
INSERT INTO clients (
  id,
  organization_id,
  company_name,
  contact_name,
  email,
  phone,
  mailing_address,
  city,
  state,
  zip,
  county,
  physical_address,
  physical_city,
  physical_state,
  physical_zip,
  pricing_tier_id,
  is_active,
  notes,
  tags,
  created_at,
  updated_at,
  lifetime_revenue,
  last_pickup_at
)
SELECT 
  dc.id,
  dc.organization_id,
  COALESCE(dc.company_name, dc.contact_name) as company_name,
  dc.contact_name,
  dc.email,
  dc.phone,
  dc.mailing_address,
  dc.city,
  dc.state,
  dc.zip,
  dc.county,
  dc.physical_address,
  dc.physical_city,
  dc.physical_state,
  dc.physical_zip,
  dc.pricing_tier_id,
  dc.is_active,
  dc.notes,
  dc.tags,
  dc.created_at,
  dc.updated_at,
  dc.lifetime_revenue,
  dc.last_dropoff_at
FROM dropoff_customers dc
WHERE NOT EXISTS (
  SELECT 1 FROM clients c WHERE c.id = dc.id
);

-- Step 3: Update dropoffs to point to clients instead of dropoff_customers
UPDATE dropoffs
SET client_id = dropoff_customer_id;

-- Step 4: Clear manifest_id from dropoffs FIRST (before deleting manifests)
UPDATE dropoffs SET manifest_id = NULL 
WHERE manifest_id IN (
  SELECT m.id FROM manifests m
  INNER JOIN clients c ON m.client_id = c.id
  WHERE c.company_name = 'Dropoff Customers' 
    AND c.contact_name = 'Various Customers'
    AND c.notes LIKE '%Default client for dropoff manifests%'
);

-- Step 5: Now delete the manifests that reference the pseudo "Dropoff Customers" client
DELETE FROM manifests 
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE company_name = 'Dropoff Customers' 
    AND contact_name = 'Various Customers'
    AND notes LIKE '%Default client for dropoff manifests%'
);

-- Step 6: Delete the pseudo "Dropoff Customers" client
DELETE FROM clients 
WHERE company_name = 'Dropoff Customers' 
  AND contact_name = 'Various Customers'
  AND notes LIKE '%Default client for dropoff manifests%';

-- Step 7: Drop the old dropoff_customer_id column
ALTER TABLE dropoffs DROP COLUMN dropoff_customer_id;

-- Step 8: Make client_id NOT NULL (all dropoffs must have a client)
ALTER TABLE dropoffs ALTER COLUMN client_id SET NOT NULL;

-- Step 9: Drop the dropoff_customers table
DROP TABLE IF EXISTS dropoff_customers CASCADE;