-- Copy existing city/zip data to physical_city/physical_zip for clients missing physical fields
UPDATE clients 
SET 
  physical_city = COALESCE(physical_city, city),
  physical_zip = COALESCE(physical_zip, zip),
  physical_state = COALESCE(physical_state, state),
  updated_at = NOW()
WHERE is_active = true
  AND (physical_city IS NULL OR physical_zip IS NULL)
  AND (city IS NOT NULL OR zip IS NOT NULL);