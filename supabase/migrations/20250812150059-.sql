-- Fix security warnings by setting proper search_path for all functions
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.calculate_pickup_revenue(pickup_row public.pickups)
RETURNS NUMERIC 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_client_stats_on_pickup_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate revenue if not already set
    IF NEW.computed_revenue = 0 THEN
      NEW.computed_revenue := public.calculate_pickup_revenue(NEW);
    END IF;
    
    -- Update client stats
    UPDATE public.clients
    SET 
      last_pickup_at = NEW.pickup_date::TIMESTAMP WITH TIME ZONE,
      lifetime_revenue = COALESCE(lifetime_revenue, 0) + NEW.computed_revenue,
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_paid NUMERIC(10,2);
  invoice_total NUMERIC(10,2);
BEGIN
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL THEN
    -- Calculate total payments for this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id;
    
    -- Get invoice total
    SELECT total_amount
    INTO invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;
    
    -- Update invoice status
    UPDATE public.invoices
    SET 
      status = CASE 
        WHEN total_paid >= invoice_total THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    -- Update client open balance
    UPDATE public.clients
    SET 
      open_balance = COALESCE(open_balance, 0) - NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;