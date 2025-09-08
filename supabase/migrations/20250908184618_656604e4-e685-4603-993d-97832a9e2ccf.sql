-- Fix the security warning by dropping trigger first, then function, then recreating both
DROP TRIGGER IF EXISTS location_update_trigger ON locations;
DROP FUNCTION IF EXISTS handle_location_update();

-- Recreate the function with proper security settings
CREATE OR REPLACE FUNCTION handle_location_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update pickups that reference this location
  UPDATE pickups 
  SET updated_at = NOW()
  WHERE location_id = NEW.id;
  
  -- Update manifests that reference this location  
  UPDATE manifests 
  SET updated_at = NOW()
  WHERE location_id = NEW.id;
  
  -- Log the change for audit purposes
  INSERT INTO audit_events (
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    changed_fields,
    organization_id
  )
  VALUES (
    'locations',
    'UPDATE',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY['address', 'name', 'access_notes'],
    NEW.organization_id
  );
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER location_update_trigger
  AFTER UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION handle_location_update();