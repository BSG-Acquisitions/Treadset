-- Step 1: Add contact_interval_days column to client_workflows
ALTER TABLE public.client_workflows 
ADD COLUMN IF NOT EXISTS contact_interval_days integer DEFAULT 30;

-- Step 2: Create function to update workflow when pickup completes
CREATE OR REPLACE FUNCTION public.update_workflow_on_pickup_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_frequency text;
  v_interval_days integer;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the client's pickup frequency pattern
    SELECT frequency INTO v_frequency
    FROM public.client_pickup_patterns
    WHERE client_id = NEW.client_id
    ORDER BY confidence_score DESC
    LIMIT 1;
    
    -- Convert frequency to days
    v_interval_days := CASE v_frequency
      WHEN 'weekly' THEN 7
      WHEN 'biweekly' THEN 14
      WHEN 'monthly' THEN 30
      ELSE 30 -- default
    END;
    
    -- Update any active follow-up workflow for this client
    UPDATE public.client_workflows
    SET 
      last_contact_date = NEW.pickup_date,
      next_contact_date = NEW.pickup_date + (v_interval_days || ' days')::interval,
      contact_interval_days = v_interval_days,
      updated_at = now()
    WHERE client_id = NEW.client_id
      AND workflow_type = 'followup'
      AND status = 'active';
      
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on pickups table
DROP TRIGGER IF EXISTS trigger_update_workflow_on_pickup ON public.pickups;
CREATE TRIGGER trigger_update_workflow_on_pickup
  AFTER UPDATE ON public.pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_on_pickup_completion();

-- Step 4: One-time cleanup - sync all stale workflows with actual pickup patterns
WITH pattern_data AS (
  SELECT 
    cpp.client_id,
    cpp.frequency,
    CASE cpp.frequency
      WHEN 'weekly' THEN 7
      WHEN 'biweekly' THEN 14
      WHEN 'monthly' THEN 30
      ELSE 30
    END as interval_days,
    c.last_pickup_at
  FROM public.client_pickup_patterns cpp
  JOIN public.clients c ON c.id = cpp.client_id
  WHERE cpp.confidence_score >= 0.5
)
UPDATE public.client_workflows cw
SET 
  last_contact_date = pd.last_pickup_at::date,
  next_contact_date = (pd.last_pickup_at + (pd.interval_days || ' days')::interval)::date,
  contact_interval_days = pd.interval_days,
  updated_at = now()
FROM pattern_data pd
WHERE cw.client_id = pd.client_id
  AND cw.workflow_type = 'followup'
  AND cw.status = 'active'
  AND pd.last_pickup_at IS NOT NULL
  AND pd.last_pickup_at::date >= cw.next_contact_date;

-- Also update workflows without patterns to use client's last_pickup_at + 30 days
UPDATE public.client_workflows cw
SET 
  last_contact_date = c.last_pickup_at::date,
  next_contact_date = (c.last_pickup_at + interval '30 days')::date,
  contact_interval_days = 30,
  updated_at = now()
FROM public.clients c
WHERE cw.client_id = c.id
  AND cw.workflow_type = 'followup'
  AND cw.status = 'active'
  AND c.last_pickup_at IS NOT NULL
  AND c.last_pickup_at::date >= cw.next_contact_date
  AND NOT EXISTS (
    SELECT 1 FROM public.client_pickup_patterns cpp 
    WHERE cpp.client_id = cw.client_id AND cpp.confidence_score >= 0.5
  );