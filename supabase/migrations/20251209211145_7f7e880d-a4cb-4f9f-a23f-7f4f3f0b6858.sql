-- Delete Test Company and all related data
-- Client IDs: 34ad0fea-0cba-4f59-ab37-ef5c56bd00e9, a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd

-- Delete client workflows (follow-ups)
DELETE FROM public.client_workflows 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete client risk scores
DELETE FROM public.client_risk_scores 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete client health scores
DELETE FROM public.client_health_scores 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete client pickup patterns
DELETE FROM public.client_pickup_patterns 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete client engagement
DELETE FROM public.client_engagement 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete client summaries
DELETE FROM public.client_summaries 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete assignments linked to Test Company pickups
DELETE FROM public.assignments 
WHERE pickup_id IN (
  SELECT id FROM public.pickups 
  WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd')
);

-- Delete manifests for Test Company
DELETE FROM public.manifests 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete pickups for Test Company
DELETE FROM public.pickups 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Delete locations for Test Company
DELETE FROM public.locations 
WHERE client_id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');

-- Finally, delete the Test Company clients themselves
DELETE FROM public.clients 
WHERE id IN ('34ad0fea-0cba-4f59-ab37-ef5c56bd00e9', 'a3b0b7f7-fb14-4cd9-9bab-7b4ad8f57bfd');