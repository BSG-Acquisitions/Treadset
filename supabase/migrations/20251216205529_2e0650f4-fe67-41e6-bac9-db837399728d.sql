-- Step 1: Remove ALL test company data (correct order for FK constraints)

-- First, unlink pickups from manifests (set manifest_id to NULL) for test companies
UPDATE public.pickups 
SET manifest_id = NULL 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Delete stripe_payments for test company manifests
DELETE FROM public.stripe_payments 
WHERE manifest_id IN (
  SELECT id FROM public.manifests 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE LOWER(company_name) LIKE '%test company%' 
       OR LOWER(company_name) LIKE '%bsg tire%'
  )
);

-- Delete notifications related to test companies
DELETE FROM public.notifications 
WHERE (metadata->>'client_id')::text IN (
  SELECT id::text FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Delete dropoffs for test companies
DELETE FROM public.dropoffs 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Now delete manifests (after unlinking pickups)
DELETE FROM public.manifests 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Delete assignments for test company pickups
DELETE FROM public.assignments 
WHERE pickup_id IN (
  SELECT id FROM public.pickups 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE LOWER(company_name) LIKE '%test company%' 
       OR LOWER(company_name) LIKE '%bsg tire%'
  )
);

-- Delete pickups for test companies
DELETE FROM public.pickups 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Delete client-related records
DELETE FROM public.client_pickup_patterns 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_health_scores 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_risk_scores 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_workflows 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_summaries 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_engagement 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.client_email_preferences 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.invoices 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

DELETE FROM public.locations 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE LOWER(company_name) LIKE '%test company%' 
     OR LOWER(company_name) LIKE '%bsg tire%'
);

-- Finally, delete the test clients themselves
DELETE FROM public.clients 
WHERE LOWER(company_name) LIKE '%test company%' 
   OR LOWER(company_name) LIKE '%bsg tire%';