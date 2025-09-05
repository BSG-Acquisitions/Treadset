-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organization_id_val UUID;
  user_id_val UUID;
  changed_fields TEXT[] := '{}';
  col_name TEXT;
BEGIN
  -- Get organization_id from the record
  IF TG_OP = 'DELETE' then
    organization_id_val := OLD.organization_id;
  ELSE
    organization_id_val := NEW.organization_id;
  END IF;

  -- Get current user_id
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO user_id_val FROM users WHERE auth_user_id = auth.uid();
  END IF;

  -- For UPDATE, determine changed fields
  IF TG_OP = 'UPDATE' THEN
    FOR col_name IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME 
      AND table_schema = 'public'
    LOOP
      IF to_jsonb(OLD) ->> col_name IS DISTINCT FROM to_jsonb(NEW) ->> col_name THEN
        changed_fields := array_append(changed_fields, col_name);
      END IF;
    END LOOP;
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_events (
    organization_id,
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    ip_address
  ) VALUES (
    organization_id_val,
    user_id_val,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::UUID
      ELSE NEW.id::UUID
    END,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    changed_fields,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop and recreate stricter RLS policies for key tables

-- Assignments: Role-based access
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.assignments;
DROP POLICY IF EXISTS "Admins and ops can view all assignments" ON public.assignments;
DROP POLICY IF EXISTS "Drivers can only view their assignments" ON public.assignments;

CREATE POLICY "Admins and ops can manage all assignments" 
ON public.assignments 
FOR ALL 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = assignments.organization_id
  AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
));

-- Manifests: Role-based access  
DROP POLICY IF EXISTS "Users can access manifests in their organizations" ON public.manifests;
DROP POLICY IF EXISTS "Admins and ops can manage all manifests" ON public.manifests;
DROP POLICY IF EXISTS "Drivers can only access their manifests" ON public.manifests;

CREATE POLICY "Admins and ops can manage all manifests" 
ON public.manifests 
FOR ALL 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = manifests.organization_id
  AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
));

CREATE POLICY "Drivers can manage their manifests" 
ON public.manifests 
FOR ALL 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = manifests.organization_id
  AND uo.role = 'driver'
  AND u.id = manifests.driver_id
));

-- Pickups: Client restrictions
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.pickups;
DROP POLICY IF EXISTS "Admins and ops can manage all pickups" ON public.pickups;
DROP POLICY IF EXISTS "Clients can only view their pickups" ON public.pickups;

CREATE POLICY "Staff can manage all pickups" 
ON public.pickups 
FOR ALL 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = pickups.organization_id
  AND uo.role IN ('admin', 'ops_manager', 'dispatcher', 'driver')
));

CREATE POLICY "Clients can only view their pickups" 
ON public.pickups 
FOR SELECT 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  JOIN clients c ON c.id = pickups.client_id
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = pickups.organization_id
  AND uo.role = 'client'
  AND u.email = c.email
));

-- Add audit triggers to key tables
DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;
CREATE TRIGGER audit_clients_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_pickups_trigger ON public.pickups;
CREATE TRIGGER audit_pickups_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.pickups  
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_manifests_trigger ON public.manifests;
CREATE TRIGGER audit_manifests_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.manifests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();