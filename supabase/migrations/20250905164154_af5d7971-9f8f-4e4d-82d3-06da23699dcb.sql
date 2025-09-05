-- Add CLIENT role to existing app_role enum
ALTER TYPE app_role ADD VALUE 'client' AFTER 'sales';

-- Create audit_events table for tracking all changes
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Audit events policy - users can only see events from their organization
CREATE POLICY "Users can view audit events in their organization" 
ON public.audit_events 
FOR SELECT 
USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

-- Only admins can insert audit events
CREATE POLICY "Only system can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (true); -- System triggers handle this

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

-- Create stricter RLS policies for driver and client roles

-- Drop existing broad policies and create role-specific ones for assignments
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.assignments;

-- Admins and ops managers can see all assignments in their org
CREATE POLICY "Admins and ops can view all assignments" 
ON public.assignments 
FOR ALL 
USING ((auth.uid() IS NULL) OR EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = assignments.organization_id
  AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
));

-- Drivers can only see their assigned pickups
CREATE POLICY "Drivers can only view their assignments" 
ON public.assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = assignments.organization_id
  AND uo.role = 'driver'
  AND EXISTS (
    SELECT 1 FROM manifests m 
    WHERE m.driver_id = u.id 
    AND (m.pickup_id = assignments.pickup_id OR m.id IN (
      SELECT manifest_id FROM pickups WHERE id = assignments.pickup_id
    ))
  )
));

-- Similar driver restrictions for manifests
DROP POLICY IF EXISTS "Users can access manifests in their organizations" ON public.manifests;

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

CREATE POLICY "Drivers can only access their manifests" 
ON public.manifests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = manifests.organization_id
  AND uo.role = 'driver'
  AND u.id = manifests.driver_id
));

-- Client restrictions for pickups - clients can only see their own
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.pickups;

CREATE POLICY "Admins and ops can manage all pickups" 
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
USING (EXISTS (
  SELECT 1 FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  JOIN clients c ON c.id = pickups.client_id
  WHERE u.auth_user_id = auth.uid() 
  AND uo.organization_id = pickups.organization_id
  AND uo.role = 'client'
  AND u.email = c.email -- Link client user to client record via email
));

-- Add audit triggers to key tables
CREATE TRIGGER audit_clients_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_pickups_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.pickups  
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_manifests_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.manifests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_invoices_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();