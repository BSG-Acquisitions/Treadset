-- Fix ambiguous column reference in generate_manifest_number function
CREATE OR REPLACE FUNCTION public.generate_manifest_number(org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  date_prefix TEXT;
  manifest_number TEXT;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Fix: Fully qualify the column reference to avoid ambiguity
  SELECT COALESCE(MAX(CAST(SUBSTRING(manifests.manifest_number FROM '^' || date_prefix || '-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.manifests
  WHERE organization_id = org_id 
  AND manifests.manifest_number ~ ('^' || date_prefix || '-\d+$');
  
  manifest_number := date_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN manifest_number;
END;
$function$