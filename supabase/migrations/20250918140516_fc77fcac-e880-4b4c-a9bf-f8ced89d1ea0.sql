-- Create drop-off customers table (similar to clients but for drop-off customers)
CREATE TABLE public.dropoff_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  customer_type TEXT DEFAULT 'one_time' CHECK (customer_type IN ('regular', 'one_time')),
  pricing_tier_id UUID,
  is_active BOOLEAN DEFAULT true,
  requires_manifest BOOLEAN DEFAULT false,
  requires_invoicing BOOLEAN DEFAULT false,
  notes TEXT,
  tags TEXT[],
  last_dropoff_at TIMESTAMP WITH TIME ZONE,
  lifetime_revenue NUMERIC(10,2) DEFAULT 0,
  total_dropoffs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dropoffs table (similar to pickups but for drop-off transactions)
CREATE TABLE public.dropoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  dropoff_customer_id UUID NOT NULL,
  dropoff_date DATE NOT NULL DEFAULT CURRENT_DATE,
  dropoff_time TIME DEFAULT CURRENT_TIME,
  
  -- Tire counts (same as pickups)
  pte_count INTEGER DEFAULT 0,
  otr_count INTEGER DEFAULT 0,
  tractor_count INTEGER DEFAULT 0,
  
  -- Pricing information
  pricing_tier_id UUID,
  unit_price_pte NUMERIC(10,2),
  unit_price_otr NUMERIC(10,2), 
  unit_price_tractor NUMERIC(10,2),
  computed_revenue NUMERIC(10,2) DEFAULT 0,
  surcharges_applied_json JSONB,
  
  -- Manifest information
  manifest_id UUID,
  manifest_pdf_path TEXT,
  requires_manifest BOOLEAN DEFAULT false,
  
  -- Processing information
  processed_by UUID, -- front office staff member
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'invoiced')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'card', 'invoice')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'invoiced')),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.dropoff_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropoffs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dropoff_customers
CREATE POLICY "Org members can manage dropoff customers" 
ON public.dropoff_customers 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- Create RLS policies for dropoffs
CREATE POLICY "Org members can manage dropoffs" 
ON public.dropoffs 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- Add foreign key constraints
ALTER TABLE public.dropoff_customers 
ADD CONSTRAINT fk_dropoff_customers_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE public.dropoff_customers 
ADD CONSTRAINT fk_dropoff_customers_pricing_tier 
FOREIGN KEY (pricing_tier_id) REFERENCES public.pricing_tiers(id);

ALTER TABLE public.dropoffs 
ADD CONSTRAINT fk_dropoffs_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE public.dropoffs 
ADD CONSTRAINT fk_dropoffs_dropoff_customer 
FOREIGN KEY (dropoff_customer_id) REFERENCES public.dropoff_customers(id);

ALTER TABLE public.dropoffs 
ADD CONSTRAINT fk_dropoffs_pricing_tier 
FOREIGN KEY (pricing_tier_id) REFERENCES public.pricing_tiers(id);

ALTER TABLE public.dropoffs 
ADD CONSTRAINT fk_dropoffs_processed_by 
FOREIGN KEY (processed_by) REFERENCES public.users(id);

ALTER TABLE public.dropoffs 
ADD CONSTRAINT fk_dropoffs_manifest 
FOREIGN KEY (manifest_id) REFERENCES public.manifests(id);

-- Update manifests table to support both pickups and dropoffs
ALTER TABLE public.manifests 
ADD COLUMN dropoff_id UUID,
ADD CONSTRAINT fk_manifests_dropoff 
FOREIGN KEY (dropoff_id) REFERENCES public.dropoffs(id);

-- Create trigger to update dropoff customer stats when dropoff is completed
CREATE OR REPLACE FUNCTION public.update_dropoff_customer_stats_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update dropoff customer stats when a dropoff is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.dropoff_customers
    SET 
      last_dropoff_at = NEW.created_at,
      lifetime_revenue = COALESCE(lifetime_revenue, 0) + NEW.computed_revenue,
      total_dropoffs = COALESCE(total_dropoffs, 0) + 1,
      updated_at = now()
    WHERE id = NEW.dropoff_customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_dropoff_customer_stats_trigger
AFTER INSERT OR UPDATE ON public.dropoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_dropoff_customer_stats_on_completion();

-- Add updated_at triggers for both tables
CREATE TRIGGER update_dropoff_customers_updated_at
BEFORE UPDATE ON public.dropoff_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dropoffs_updated_at
BEFORE UPDATE ON public.dropoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();