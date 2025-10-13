-- First, clear all foreign key references to pickups we're about to delete

-- Clear manifest references
UPDATE manifests 
SET pickup_id = NULL 
WHERE pickup_id IN (
  SELECT p.id FROM pickups p
  JOIN clients c ON p.client_id = c.id
  WHERE LOWER(c.company_name) LIKE '%test%'
);

UPDATE manifests 
SET pickup_id = NULL 
WHERE pickup_id IN (
  SELECT id FROM pickups WHERE pickup_date < '2025-09-01'
);

-- Clear stripe payment references
UPDATE stripe_payments 
SET pickup_id = NULL 
WHERE pickup_id IN (
  SELECT p.id FROM pickups p
  JOIN clients c ON p.client_id = c.id
  WHERE LOWER(c.company_name) LIKE '%test%'
);

UPDATE stripe_payments 
SET pickup_id = NULL 
WHERE pickup_id IN (
  SELECT id FROM pickups WHERE pickup_date < '2025-09-01'
);

-- Clear invoice items references
DELETE FROM invoice_items 
WHERE pickup_id IN (
  SELECT p.id FROM pickups p
  JOIN clients c ON p.client_id = c.id
  WHERE LOWER(c.company_name) LIKE '%test%'
);

DELETE FROM invoice_items 
WHERE pickup_id IN (
  SELECT id FROM pickups WHERE pickup_date < '2025-09-01'
);

-- Clear assignments
DELETE FROM assignments 
WHERE pickup_id IN (
  SELECT p.id FROM pickups p
  JOIN clients c ON p.client_id = c.id
  WHERE LOWER(c.company_name) LIKE '%test%'
);

DELETE FROM assignments 
WHERE pickup_id IN (
  SELECT id FROM pickups WHERE pickup_date < '2025-09-01'
);

-- Now delete the pickups
DELETE FROM pickups 
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE LOWER(company_name) LIKE '%test%'
);

DELETE FROM pickups 
WHERE pickup_date < '2025-09-01';

-- Clean up orphaned client summaries
DELETE FROM client_summaries 
WHERE NOT EXISTS (
  SELECT 1 FROM pickups p 
  WHERE p.client_id = client_summaries.client_id
);

-- Delete test clients with no remaining data
DELETE FROM clients 
WHERE LOWER(company_name) LIKE '%test%' 
AND NOT EXISTS (
  SELECT 1 FROM pickups WHERE client_id = clients.id
)
AND NOT EXISTS (
  SELECT 1 FROM manifests WHERE client_id = clients.id
);