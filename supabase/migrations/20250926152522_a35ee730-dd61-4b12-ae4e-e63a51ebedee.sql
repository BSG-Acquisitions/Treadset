-- Simple seed data without conflict handling
-- Create test clients with county data 
DELETE FROM pickups WHERE client_id IN (SELECT id FROM clients WHERE email LIKE 'test%@example.com');
DELETE FROM clients WHERE email LIKE 'test%@example.com';

-- Insert test clients
INSERT INTO clients (organization_id, company_name, email, phone, county, is_active)
SELECT 
    id as organization_id,
    'Test Generator Wayne County',
    'testwayne@example.com',
    '555-0001',
    'Wayne',
    true
FROM organizations LIMIT 1;

INSERT INTO clients (organization_id, company_name, email, phone, county, is_active)
SELECT 
    id as organization_id,
    'Test Generator Oakland County', 
    'testoakland@example.com',
    '555-0002',
    'Oakland',
    true
FROM organizations LIMIT 1;

INSERT INTO clients (organization_id, company_name, email, phone, county, is_active)
SELECT 
    id as organization_id,
    'Test Generator Macomb County',
    'testmacomb@example.com', 
    '555-0003',
    'Macomb',
    true
FROM organizations LIMIT 1;

-- Create test pickups for 2025
INSERT INTO pickups (organization_id, client_id, pickup_date, pte_count, otr_count, tractor_count, status, computed_revenue)
SELECT 
    c.organization_id,
    c.id,
    '2025-01-15'::date,
    150,
    10,
    5,
    'completed',
    150 * 25 + 10 * 45 + 5 * 35
FROM clients c WHERE c.county = 'Wayne' AND c.email = 'testwayne@example.com';

INSERT INTO pickups (organization_id, client_id, pickup_date, pte_count, otr_count, tractor_count, status, computed_revenue)
SELECT 
    c.organization_id,
    c.id,
    '2025-02-15'::date,
    120,
    8,
    4,
    'completed',
    120 * 25 + 8 * 45 + 4 * 35
FROM clients c WHERE c.county = 'Oakland' AND c.email = 'testoakland@example.com';

INSERT INTO pickups (organization_id, client_id, pickup_date, pte_count, otr_count, tractor_count, status, computed_revenue) 
SELECT 
    c.organization_id,
    c.id,
    '2025-03-15'::date,
    100,
    6,
    3,
    'completed',
    100 * 25 + 6 * 45 + 3 * 35
FROM clients c WHERE c.county = 'Macomb' AND c.email = 'testmacomb@example.com';