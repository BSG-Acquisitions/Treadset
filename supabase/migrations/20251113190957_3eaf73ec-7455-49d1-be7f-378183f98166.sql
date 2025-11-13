-- Copy all generators to clients table, skipping duplicates based on company_name
-- This ensures drop-off generators are available for pickups without creating duplicates

INSERT INTO clients (
  organization_id,
  company_name,
  contact_name,
  mailing_address,
  city,
  state,
  zip,
  phone,
  county,
  is_active,
  created_at,
  updated_at
)
SELECT 
  (SELECT id FROM organizations ORDER BY created_at LIMIT 1) as organization_id,
  g.generator_name,
  g.generator_name, -- contact_name same as company_name for generators
  g.generator_mailing_address,
  g.generator_city,
  g.generator_state,
  g.generator_zip,
  g.generator_phone,
  g.generator_county,
  g.is_active,
  COALESCE(g.created_at, now()) as created_at,
  now() as updated_at
FROM generators g
WHERE g.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM clients c 
    WHERE LOWER(TRIM(c.company_name)) = LOWER(TRIM(g.generator_name))
      AND c.is_active = true
  );