-- Create function to auto-resolve missing_pickup notifications
CREATE OR REPLACE FUNCTION public.auto_resolve_missing_pickup_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- When a pickup is completed, delete any missing_pickup notifications for that client
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    DELETE FROM public.notifications 
    WHERE type = 'missing_pickup' 
    AND (metadata->>'client_id')::uuid = NEW.client_id;
    
    RAISE LOG 'Auto-resolved missing_pickup notifications for client % (pickup completed)', NEW.client_id;
  END IF;
  
  -- When a new pickup is scheduled, also resolve notifications for that client
  IF TG_OP = 'INSERT' AND NEW.status = 'scheduled' THEN
    DELETE FROM public.notifications 
    WHERE type = 'missing_pickup' 
    AND (metadata->>'client_id')::uuid = NEW.client_id;
    
    RAISE LOG 'Auto-resolved missing_pickup notifications for client % (pickup scheduled)', NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for pickup completion
DROP TRIGGER IF EXISTS resolve_notifications_on_pickup_complete ON public.pickups;
CREATE TRIGGER resolve_notifications_on_pickup_complete
AFTER UPDATE ON public.pickups
FOR EACH ROW
EXECUTE FUNCTION public.auto_resolve_missing_pickup_notifications();

-- Create trigger for new scheduled pickups
DROP TRIGGER IF EXISTS resolve_notifications_on_pickup_scheduled ON public.pickups;
CREATE TRIGGER resolve_notifications_on_pickup_scheduled
AFTER INSERT ON public.pickups
FOR EACH ROW
EXECUTE FUNCTION public.auto_resolve_missing_pickup_notifications();

-- Clean up existing stale notifications where client has been picked up since notification
DELETE FROM public.notifications n
WHERE n.type = 'missing_pickup'
AND EXISTS (
  SELECT 1 FROM public.pickups p
  WHERE p.client_id = (n.metadata->>'client_id')::uuid
  AND (p.status = 'completed' OR p.status = 'scheduled')
  AND p.pickup_date >= DATE(n.created_at)
);