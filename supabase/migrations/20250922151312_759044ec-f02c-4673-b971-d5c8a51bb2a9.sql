-- Allow drivers to view pickups they are assigned to through assignments
-- This policy allows drivers to see pickup data for assignments they are assigned to

-- First drop the existing policy that might be too restrictive
DROP POLICY IF EXISTS "Users access pickups" ON public.pickups;

-- Create a new comprehensive policy for pickup access
CREATE POLICY "Enhanced pickup access" ON public.pickups
FOR SELECT USING (
  -- Existing admin/ops/dispatcher access
  (EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = pickups.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))) 
  OR 
  -- Existing client access
  (EXISTS ( SELECT 1
   FROM ((user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
     JOIN clients c ON ((c.id = pickups.client_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = pickups.organization_id) AND (uo.role = 'client'::app_role) AND (u.email = c.email)))) 
  OR 
  -- Existing driver access via manifests
  (EXISTS ( SELECT 1
   FROM (manifests m
     JOIN users u ON ((u.id = m.driver_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (m.pickup_id = pickups.id) AND (m.organization_id = pickups.organization_id))))
  OR
  -- NEW: Driver access via assignments
  (EXISTS ( SELECT 1
   FROM (assignments a
     JOIN users u ON ((u.id = a.driver_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (a.pickup_id = pickups.id) AND (a.organization_id = pickups.organization_id))))
);

-- Keep the existing insert policy for pickups
CREATE POLICY "Enhanced pickup insert" ON public.pickups
FOR INSERT WITH CHECK (
  EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = pickups.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);