-- Phase 2: Database Cleanup - Remove deprecated overlay system and consolidate generators

-- Step 1: Migrate remaining generator "BSG Tire Collection - Detroit" to clients (if not already exists)
INSERT INTO clients (company_name, contact_name, physical_address, city, state, zip, county, phone, mailing_address, organization_id, is_active)
SELECT 
  g.generator_name,
  g.generator_name,
  g.generator_physical_address,
  g.generator_city,
  g.generator_state,
  g.generator_zip,
  g.generator_county,
  g.generator_phone,
  g.generator_mailing_address,
  (SELECT id FROM organizations LIMIT 1),
  g.is_active
FROM generators g
WHERE g.generator_name = 'BSG Tire Collection - Detroit'
AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.company_name = g.generator_name);

-- Step 2: Drop deprecated overlay views (used by old PDF system)
DROP VIEW IF EXISTS generator_overlay_view;
DROP VIEW IF EXISTS hauler_overlay_view;
DROP VIEW IF EXISTS receiver_overlay_view;

-- Step 3: Clean up deprecated PDF calibration data (use CASCADE for FK constraint)
TRUNCATE TABLE pdf_calibrations CASCADE;
TRUNCATE TABLE pdf_templates CASCADE;

-- Step 4: Drop the FK constraint on stops table first, then drop generators
ALTER TABLE stops DROP CONSTRAINT IF EXISTS stops_generator_id_fkey;

-- Step 5: Drop deprecated generators table (now consolidated into clients)
DROP TABLE IF EXISTS generators;