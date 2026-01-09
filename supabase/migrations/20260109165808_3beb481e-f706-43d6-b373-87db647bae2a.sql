-- Function to auto-sync driver_id from vehicle
CREATE OR REPLACE FUNCTION sync_assignment_driver_id()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
BEGIN
  -- Only sync if vehicle_id is set and driver_id is null
  IF NEW.vehicle_id IS NOT NULL AND NEW.driver_id IS NULL THEN
    -- First try assigned_driver_id on the vehicle
    SELECT assigned_driver_id INTO v_driver_id
    FROM vehicles
    WHERE id = NEW.vehicle_id;
    
    -- If no assigned_driver_id, try to resolve from driver_email
    IF v_driver_id IS NULL THEN
      SELECT u.id INTO v_driver_id
      FROM vehicles v
      JOIN users u ON lower(u.email) = lower(v.driver_email)
      WHERE v.id = NEW.vehicle_id;
    END IF;
    
    -- Set the driver_id if we found one
    IF v_driver_id IS NOT NULL THEN
      NEW.driver_id := v_driver_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_sync_assignment_driver ON assignments;
CREATE TRIGGER trigger_sync_assignment_driver
  BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION sync_assignment_driver_id();