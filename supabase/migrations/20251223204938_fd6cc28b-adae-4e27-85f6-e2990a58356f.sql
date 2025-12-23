-- Create a system "Walk-in / One-Off Drop-off" client for each organization
-- This is idempotent - will not create duplicates
INSERT INTO public.clients (
  organization_id,
  company_name,
  contact_name,
  notes,
  is_active
)
SELECT 
  o.id,
  'Walk-in / One-Off Drop-off',
  'Walk-in Customer',
  '[SYSTEM-WALKIN] This is a system client for one-off drop-offs from walk-in customers.',
  true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients c 
  WHERE c.organization_id = o.id 
  AND c.notes LIKE '%[SYSTEM-WALKIN]%'
);