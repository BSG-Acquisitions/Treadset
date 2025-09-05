-- Create followup workflows for clients with historical pickup data in notes
INSERT INTO public.client_workflows (
  client_id,
  organization_id,
  workflow_type,
  status,
  next_contact_date,
  contact_frequency_days,
  notes
)
SELECT 
  c.id,
  c.organization_id,
  'followup'::text,
  'active'::text,
  CURRENT_DATE,
  30,
  CASE 
    WHEN c.notes LIKE '%Last pickup: 2025-03-11%' THEN 'Auto-created: Last pickup 2025-03-11 (178+ days ago)'
    WHEN c.notes LIKE '%Last pickup: 2025-07-21%' THEN 'Auto-created: Last pickup 2025-07-21 (45+ days ago)'
    WHEN c.notes LIKE '%Last pickup: 2025-05-05%' THEN 'Auto-created: Last pickup 2025-05-05 (123+ days ago)'
    WHEN c.notes LIKE '%Last pickup: 2025-06-04%' THEN 'Auto-created: Last pickup 2025-06-04 (93+ days ago)'
    ELSE 'Auto-created: Long-term inactive client needs followup'
  END
FROM public.clients c
WHERE c.is_active = true
AND c.organization_id IS NOT NULL
AND (
  c.notes LIKE '%Last pickup: 2025-03-11%' OR
  c.notes LIKE '%Last pickup: 2025-07-21%' OR  
  c.notes LIKE '%Last pickup: 2025-05-05%' OR
  c.notes LIKE '%Last pickup: 2025-06-04%'
)
AND NOT EXISTS (
  SELECT 1 FROM public.client_workflows cw 
  WHERE cw.client_id = c.id 
  AND cw.workflow_type = 'followup' 
  AND cw.status = 'active'
);