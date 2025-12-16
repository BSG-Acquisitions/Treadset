-- Create function to update client stats when dropoff is created/updated
CREATE OR REPLACE FUNCTION public.update_client_stats_on_dropoff()
RETURNS TRIGGER AS $$
BEGIN
  -- When a dropoff is inserted, add revenue to client
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clients
    SET 
      lifetime_revenue = COALESCE(lifetime_revenue, 0) + COALESCE(NEW.computed_revenue, 0),
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  -- When a dropoff is updated and revenue changed, adjust the difference
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.computed_revenue, 0) != COALESCE(OLD.computed_revenue, 0) THEN
    UPDATE public.clients
    SET 
      lifetime_revenue = COALESCE(lifetime_revenue, 0) + COALESCE(NEW.computed_revenue, 0) - COALESCE(OLD.computed_revenue, 0),
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on dropoffs table
DROP TRIGGER IF EXISTS update_client_on_dropoff ON public.dropoffs;
CREATE TRIGGER update_client_on_dropoff
AFTER INSERT OR UPDATE ON public.dropoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_client_stats_on_dropoff();

-- Backfill existing dropoff revenue to clients
-- First, calculate total dropoff revenue per client
UPDATE public.clients c
SET 
  lifetime_revenue = COALESCE(c.lifetime_revenue, 0) + COALESCE(dropoff_totals.total_revenue, 0),
  updated_at = NOW()
FROM (
  SELECT client_id, SUM(COALESCE(computed_revenue, 0)) as total_revenue
  FROM public.dropoffs
  WHERE client_id IS NOT NULL AND computed_revenue > 0
  GROUP BY client_id
) dropoff_totals
WHERE c.id = dropoff_totals.client_id;