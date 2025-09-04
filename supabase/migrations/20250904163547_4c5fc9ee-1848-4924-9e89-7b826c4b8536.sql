-- Create an edge function to automatically detect clients needing followup after 30 days without pickup
-- This will run as a scheduled job to create client workflows for inactive clients

-- First, let's add a function that finds clients needing followup
CREATE OR REPLACE FUNCTION public.create_followup_workflows_for_inactive_clients()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  inactive_client RECORD;
  workflows_created INTEGER := 0;
  thirty_days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  -- Find clients who haven't had a pickup in 30+ days and don't have an active followup workflow
  FOR inactive_client IN
    SELECT DISTINCT 
      c.id as client_id,
      c.organization_id,
      c.company_name,
      COALESCE(MAX(p.pickup_date), c.created_at::date) as last_pickup_date
    FROM public.clients c
    LEFT JOIN public.pickups p ON c.id = p.client_id AND p.status = 'completed'
    WHERE c.is_active = true
    AND c.organization_id IS NOT NULL
    AND NOT EXISTS (
      -- Don't create if there's already an active followup workflow
      SELECT 1 FROM public.client_workflows cw 
      WHERE cw.client_id = c.id 
      AND cw.workflow_type = 'followup' 
      AND cw.status = 'active'
      AND cw.next_contact_date >= CURRENT_DATE
    )
    GROUP BY c.id, c.organization_id, c.company_name, c.created_at
    HAVING COALESCE(MAX(p.pickup_date), c.created_at::date) <= thirty_days_ago
  LOOP
    -- Create a followup workflow for this inactive client
    INSERT INTO public.client_workflows (
      client_id,
      organization_id,
      workflow_type,
      status,
      next_contact_date,
      contact_frequency_days,
      notes
    ) VALUES (
      inactive_client.client_id,
      inactive_client.organization_id,
      'followup',
      'active',
      CURRENT_DATE, -- Due today since they're already overdue
      30, -- Contact every 30 days
      CONCAT('Auto-created: No pickup since ', inactive_client.last_pickup_date, ' (', 
             CURRENT_DATE - inactive_client.last_pickup_date, ' days ago)')
    );
    
    workflows_created := workflows_created + 1;
  END LOOP;

  RETURN workflows_created;
END;
$$;