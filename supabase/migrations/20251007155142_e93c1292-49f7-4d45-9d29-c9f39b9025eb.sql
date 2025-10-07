-- Create hauler profile for super admin testing
-- Only insert if not already exists
INSERT INTO public.haulers (
  user_id,
  company_name,
  hauler_name,
  email,
  phone,
  is_approved,
  is_active
)
SELECT 
  '1c39d6ae-c319-47a8-96ed-a58de61d13ee',
  'BSG Logistics - Hauler Division',
  'Zach Devon',
  'zachdevon@bsgtires.com',
  '+17344156528',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.haulers 
  WHERE user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee'
);