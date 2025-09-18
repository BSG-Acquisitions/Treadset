-- Fix Security Definer functions that don't need elevated privileges
-- Only keep SECURITY DEFINER for functions that actually need it

-- Functions that can be changed to SECURITY INVOKER (safer default)

-- 1. calculate_pickup_revenue - this function only reads data, doesn't need DEFINER
CREATE OR REPLACE FUNCTION public.calculate_pickup_revenue(pickup_row pickups)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  pte_rate NUMERIC(10,2) := 0;
  otr_rate NUMERIC(10,2) := 0;
  tractor_rate NUMERIC(10,2) := 0;
  total_revenue NUMERIC(10,2) := 0;
BEGIN
  -- Get rates using pricing cascade: Location -> Client -> Organization defaults
  
  -- Try location pricing tier first
  IF pickup_row.location_id IS NOT NULL THEN
    SELECT pt.pte_rate, pt.otr_rate, pt.tractor_rate
    INTO pte_rate, otr_rate, tractor_rate
    FROM public.locations l
    JOIN public.pricing_tiers pt ON l.pricing_tier_id = pt.id
    WHERE l.id = pickup_row.location_id
    AND pt.pte_rate IS NOT NULL AND pt.otr_rate IS NOT NULL AND pt.tractor_rate IS NOT NULL;
  END IF;
  
  -- If no location pricing, try client pricing tier
  IF pte_rate = 0 OR otr_rate = 0 OR tractor_rate = 0 THEN
    SELECT pt.pte_rate, pt.otr_rate, pt.tractor_rate
    INTO pte_rate, otr_rate, tractor_rate
    FROM public.clients c
    JOIN public.pricing_tiers pt ON c.pricing_tier_id = pt.id
    WHERE c.id = pickup_row.client_id
    AND pt.pte_rate IS NOT NULL AND pt.otr_rate IS NOT NULL AND pt.tractor_rate IS NOT NULL;
  END IF;
  
  -- If still no pricing, use organization defaults
  IF pte_rate = 0 OR otr_rate = 0 OR tractor_rate = 0 THEN
    SELECT default_pte_rate, default_otr_rate, default_tractor_rate
    INTO pte_rate, otr_rate, tractor_rate
    FROM public.organization_settings
    LIMIT 1;
  END IF;
  
  -- Calculate total revenue
  total_revenue := 
    (COALESCE(pickup_row.pte_count, 0) * COALESCE(pte_rate, 0)) +
    (COALESCE(pickup_row.otr_count, 0) * COALESCE(otr_rate, 0)) +
    (COALESCE(pickup_row.tractor_count, 0) * COALESCE(tractor_rate, 0));
    
  RETURN total_revenue;
END;
$$;

-- 2. generate_invoice_number - this can be INVOKER since it only generates numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_suffix TEXT;
BEGIN
  year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '^INV-(\d+)-' || year_suffix || '$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ ('^INV-\d+-' || year_suffix || '$');
  
  RETURN 'INV-' || LPAD(next_number::TEXT, 4, '0') || '-' || year_suffix;
END;
$$;

-- 3. generate_manifest_number - this can be INVOKER since it only generates numbers
CREATE OR REPLACE FUNCTION public.generate_manifest_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path = public
AS $$
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
$$;

-- 4. get_or_create_user_preferences - this can be INVOKER since RLS will handle access control
CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(target_user_id uuid)
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path = public
AS $$
DECLARE
  prefs public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO prefs FROM public.user_preferences WHERE user_id = target_user_id;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (user_id) VALUES (target_user_id)
    RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$;

-- Note: Keeping the following functions as SECURITY DEFINER because they need elevated privileges:
-- - audit_trigger: Needs to write audit records regardless of user permissions
-- - create_followup_workflows_for_inactive_clients: System maintenance function
-- - get_current_user_organization: Needs to access user role tables
-- - handle_location_update: Needs to write audit records
-- - update_* functions: These are triggers that need elevated privileges
-- - user_has_role: Needs to access user role tables