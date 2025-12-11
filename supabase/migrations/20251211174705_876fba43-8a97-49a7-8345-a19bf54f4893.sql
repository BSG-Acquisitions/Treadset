-- Clean test data: Must unlink pickups from manifests FIRST, then delete manifests

-- Step 1: Unlink pickups from manifests for Test Company
UPDATE public.pickups SET manifest_id = NULL 
WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');

-- Step 2: Delete manifests for Test Company
DELETE FROM public.manifests 
WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');

-- Step 3: Delete pickups for Test Company
DELETE FROM public.pickups 
WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');

-- Step 4: Delete dropoffs for Test Company  
DELETE FROM public.dropoffs
WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');

-- Step 5: Delete related tables for Test Company
DELETE FROM public.client_summaries WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');
DELETE FROM public.client_workflows WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');
DELETE FROM public.client_pickup_patterns WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');
DELETE FROM public.client_health_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');
DELETE FROM public.client_risk_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');
DELETE FROM public.client_engagement WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Test Company');

-- Step 6: Delete the Test Company client
DELETE FROM public.clients WHERE company_name = 'Test Company';

-- BSG Tire Recycling: Unlink pickups first, then delete September manifests
UPDATE public.pickups SET manifest_id = NULL 
WHERE manifest_id IN (
  SELECT m.id FROM public.manifests m
  JOIN public.clients c ON m.client_id = c.id
  WHERE c.company_name = 'BSG Tire Recycling' AND m.created_at < '2025-10-01'
);

DELETE FROM public.manifests 
WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'BSG Tire Recycling')
AND created_at < '2025-10-01';

-- Placeholder clients cleanup (same pattern: unlink, delete manifests, delete pickups, delete client)
-- Metro Tire Services
UPDATE public.pickups SET manifest_id = NULL WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.manifests WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.pickups WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.dropoffs WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_summaries WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_workflows WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_pickup_patterns WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_health_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_risk_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.client_engagement WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Metro Tire Services');
DELETE FROM public.clients WHERE company_name = 'Metro Tire Services';

-- Auto Parts Plus
UPDATE public.pickups SET manifest_id = NULL WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.manifests WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.pickups WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.dropoffs WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_summaries WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_workflows WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_pickup_patterns WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_health_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_risk_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.client_engagement WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Auto Parts Plus');
DELETE FROM public.clients WHERE company_name = 'Auto Parts Plus';

-- Green Valley Auto
UPDATE public.pickups SET manifest_id = NULL WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.manifests WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.pickups WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.dropoffs WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_summaries WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_workflows WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_pickup_patterns WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_health_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_risk_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.client_engagement WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Green Valley Auto');
DELETE FROM public.clients WHERE company_name = 'Green Valley Auto';

-- Residential Customer - Miller
UPDATE public.pickups SET manifest_id = NULL WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.manifests WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.pickups WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.dropoffs WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_summaries WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_workflows WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_pickup_patterns WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_health_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_risk_scores WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.client_engagement WHERE client_id IN (SELECT id FROM public.clients WHERE company_name = 'Residential Customer - Miller');
DELETE FROM public.clients WHERE company_name = 'Residential Customer - Miller';