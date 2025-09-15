-- Clean up test data from the database in correct order
-- Handle foreign key constraints properly

-- First, remove foreign key references
UPDATE pickups SET manifest_id = NULL WHERE manifest_id IS NOT NULL;

-- Delete in order to respect remaining foreign key constraints
DELETE FROM audit_events;
DELETE FROM invoice_items;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM assignments;
DELETE FROM client_summaries;
DELETE FROM client_pricing_overrides;
DELETE FROM location_pricing_overrides;
DELETE FROM pickups;
DELETE FROM manifests;
DELETE FROM locations;
DELETE FROM clients;

-- Clean up any workflow data
DELETE FROM client_workflows;

-- Optional: Insert a single test client for development if needed
INSERT INTO clients (
  organization_id,
  company_name,
  contact_name,
  email,
  phone,
  is_active
) 
SELECT 
  id as organization_id,
  'Test Client (Development Only)' as company_name,
  'Test Contact' as contact_name,
  'test@example.com' as email,
  '555-0123' as phone,
  true as is_active
FROM organizations 
LIMIT 1;