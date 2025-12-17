-- Create location records for clients that have addresses but no location record
INSERT INTO public.locations (client_id, organization_id, name, address, is_active)
SELECT 
  c.id as client_id,
  c.organization_id,
  c.company_name || ' - Primary Location' as name,
  TRIM(CONCAT_WS(', ',
    NULLIF(TRIM(COALESCE(c.mailing_address, '')), ''),
    NULLIF(TRIM(COALESCE(c.city, '')), ''),
    NULLIF(TRIM(CONCAT_WS(' ', COALESCE(c.state, ''), COALESCE(c.zip, ''))), '')
  )) as address,
  true as is_active
FROM public.clients c
WHERE c.is_active = true
  AND c.mailing_address IS NOT NULL 
  AND TRIM(c.mailing_address) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.client_id = c.id
  );