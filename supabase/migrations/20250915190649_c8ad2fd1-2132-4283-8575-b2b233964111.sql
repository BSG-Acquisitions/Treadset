-- Clean up test data from the database
-- This will remove all test data while preserving the structure

-- Delete in order to respect foreign key constraints
DELETE FROM audit_events;
DELETE FROM invoice_items;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM assignments;
DELETE FROM manifests;
DELETE FROM pickups;
DELETE FROM client_summaries;
DELETE FROM client_pricing_overrides;
DELETE FROM location_pricing_overrides;
DELETE FROM locations;
DELETE FROM clients;

-- Reset any sequences (if you have any auto-incrementing fields)
-- This ensures IDs start fresh from 1

-- Clean up any uploaded files references (storage cleanup would need to be done separately)
-- Note: This migration only cleans the database records, not the actual files in storage

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