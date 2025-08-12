-- Add comprehensive pricing and finance system
-- First, update pricing_tiers table to include rates for different tire types
ALTER TABLE public.pricing_tiers 
ADD COLUMN pte_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN otr_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN tractor_rate NUMERIC(10,2) DEFAULT 0;

-- Add financial tracking columns to pickups
ALTER TABLE public.pickups 
ADD COLUMN computed_revenue NUMERIC(10,2) DEFAULT 0,
ADD COLUMN pricing_tier_id UUID REFERENCES public.pricing_tiers(id);

-- Create organization settings table for default pricing
CREATE TABLE public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'BSG Logistics',
  default_pte_rate NUMERIC(10,2) DEFAULT 25.00,
  default_otr_rate NUMERIC(10,2) DEFAULT 45.00,
  default_tractor_rate NUMERIC(10,2) DEFAULT 35.00,
  tax_rate NUMERIC(5,4) DEFAULT 0.0825, -- 8.25%
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default organization settings
INSERT INTO public.organization_settings (name) VALUES ('BSG Logistics');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_number TEXT UNIQUE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue
  issued_date DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table to link pickups to invoices
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  pickup_id UUID NOT NULL REFERENCES public.pickups(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'check', -- check, credit_card, bank_transfer, cash
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all operations (permissive for now)
CREATE POLICY "Allow all operations on organization_settings" 
ON public.organization_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoices" 
ON public.invoices FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_items" 
ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on payments" 
ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_pickup_id ON public.invoice_items(pickup_id);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_pickups_pricing_tier_id ON public.pickups(pricing_tier_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to calculate pickup revenue based on pricing cascade
CREATE OR REPLACE FUNCTION public.calculate_pickup_revenue(pickup_row public.pickups)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to update client stats when pickup is completed
CREATE OR REPLACE FUNCTION public.update_client_stats_on_pickup_completion()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER pickup_completion_stats_trigger
  BEFORE UPDATE ON public.pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_stats_on_pickup_completion();

-- Create function to update invoice totals when payments are added
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_invoice_update_trigger
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status_on_payment();

-- Update existing pricing tiers with sample rates
UPDATE public.pricing_tiers 
SET 
  pte_rate = CASE 
    WHEN name ILIKE '%premium%' THEN 30.00
    WHEN name ILIKE '%standard%' THEN 25.00
    WHEN name ILIKE '%basic%' THEN 20.00
    ELSE 25.00
  END,
  otr_rate = CASE 
    WHEN name ILIKE '%premium%' THEN 50.00
    WHEN name ILIKE '%standard%' THEN 45.00
    WHEN name ILIKE '%basic%' THEN 40.00
    ELSE 45.00
  END,
  tractor_rate = CASE 
    WHEN name ILIKE '%premium%' THEN 40.00
    WHEN name ILIKE '%standard%' THEN 35.00
    WHEN name ILIKE '%basic%' THEN 30.00
    ELSE 35.00
  END
WHERE pte_rate IS NULL OR otr_rate IS NULL OR tractor_rate IS NULL;