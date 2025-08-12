-- Create client summaries table for annual data tracking
CREATE TABLE public.client_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER,
  total_pickups INTEGER DEFAULT 0,
  total_ptes INTEGER DEFAULT 0,
  total_otr INTEGER DEFAULT 0,
  total_tractor INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  total_weight_tons NUMERIC(8,2) DEFAULT 0,
  total_volume_yards NUMERIC(8,2) DEFAULT 0,
  first_pickup_date DATE,
  last_pickup_date DATE,
  average_pickup_size NUMERIC(8,2),
  pickup_frequency_days INTEGER,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique constraint per client/year/month
  UNIQUE(client_id, year, month, organization_id)
);

-- Enable RLS
ALTER TABLE public.client_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access data in their organizations" 
ON public.client_summaries 
FOR ALL 
USING (
  (auth.uid() IS NULL) OR 
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  ))
);

-- Create pickup analytics view for better reporting
CREATE VIEW public.pickup_analytics AS
SELECT 
  c.id as client_id,
  c.company_name,
  c.type as client_type,
  EXTRACT(YEAR FROM p.pickup_date) as year,
  EXTRACT(MONTH FROM p.pickup_date) as month,
  COUNT(*) as pickup_count,
  SUM(p.pte_count) as total_ptes,
  SUM(p.otr_count) as total_otr,
  SUM(p.tractor_count) as total_tractor,
  SUM(p.computed_revenue) as total_revenue,
  AVG(p.pte_count + p.otr_count + p.tractor_count) as avg_pickup_size,
  MIN(p.pickup_date) as first_pickup,
  MAX(p.pickup_date) as last_pickup,
  c.organization_id
FROM public.clients c
LEFT JOIN public.pickups p ON c.id = p.client_id
WHERE p.status = 'completed'
GROUP BY c.id, c.company_name, c.type, EXTRACT(YEAR FROM p.pickup_date), EXTRACT(MONTH FROM p.pickup_date), c.organization_id;

-- Create function to update client summaries from pickups
CREATE OR REPLACE FUNCTION public.update_client_summary_from_pickup()
RETURNS TRIGGER AS $$
BEGIN
  -- When a pickup is completed, update/create client summary
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.client_summaries (
      client_id,
      year,
      month,
      total_pickups,
      total_ptes,
      total_otr,
      total_tractor,
      total_revenue,
      first_pickup_date,
      last_pickup_date,
      organization_id
    )
    SELECT 
      NEW.client_id,
      EXTRACT(YEAR FROM NEW.pickup_date)::INTEGER,
      EXTRACT(MONTH FROM NEW.pickup_date)::INTEGER,
      1,
      NEW.pte_count,
      NEW.otr_count,
      NEW.tractor_count,
      NEW.computed_revenue,
      NEW.pickup_date,
      NEW.pickup_date,
      NEW.organization_id
    ON CONFLICT (client_id, year, month, organization_id) 
    DO UPDATE SET
      total_pickups = client_summaries.total_pickups + 1,
      total_ptes = client_summaries.total_ptes + NEW.pte_count,
      total_otr = client_summaries.total_otr + NEW.otr_count,
      total_tractor = client_summaries.total_tractor + NEW.tractor_count,
      total_revenue = client_summaries.total_revenue + NEW.computed_revenue,
      last_pickup_date = GREATEST(client_summaries.last_pickup_date, NEW.pickup_date),
      first_pickup_date = LEAST(client_summaries.first_pickup_date, NEW.pickup_date),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER update_client_summary_trigger
  AFTER INSERT OR UPDATE ON public.pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_summary_from_pickup();

-- Add update trigger for client_summaries
CREATE TRIGGER update_client_summaries_updated_at
  BEFORE UPDATE ON public.client_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();