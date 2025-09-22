-- Allow drivers to create manifests for pickups they are assigned to
-- Drop existing manifest policies if they exist
DROP POLICY IF EXISTS "Users can manage manifests" ON public.manifests;
DROP POLICY IF EXISTS "Service role can access manifests" ON public.manifests;

-- Create comprehensive manifest access policies
CREATE POLICY "Enhanced manifest select" ON public.manifests
FOR SELECT USING (
  -- Admins, ops managers, dispatchers can see all
  (EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = manifests.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))) 
  OR 
  -- Drivers can see their own manifests
  (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.id = manifests.driver_id))))
  OR
  -- Clients can see manifests for their pickups
  (EXISTS ( SELECT 1
   FROM ((user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
     JOIN pickups p ON ((p.id = manifests.pickup_id))
     JOIN clients c ON ((c.id = p.client_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = manifests.organization_id) AND (uo.role = 'client'::app_role) AND (u.email = c.email))))
);

CREATE POLICY "Enhanced manifest insert" ON public.manifests
FOR INSERT WITH CHECK (
  -- Admins, ops managers, dispatchers can create manifests
  (EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = manifests.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))) 
  OR 
  -- Drivers can create manifests for pickups they are assigned to
  (EXISTS ( SELECT 1
   FROM (assignments a
     JOIN users u ON ((u.id = a.driver_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (a.pickup_id = manifests.pickup_id) AND (a.organization_id = manifests.organization_id) AND (u.id = manifests.driver_id))))
);

CREATE POLICY "Enhanced manifest update" ON public.manifests
FOR UPDATE USING (
  -- Admins, ops managers, dispatchers can update manifests
  (EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = manifests.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))) 
  OR 
  -- Drivers can update their own manifests
  (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.id = manifests.driver_id))))
) WITH CHECK (
  -- Same conditions for WITH CHECK
  (EXISTS ( SELECT 1
   FROM (user_organization_roles uo
     JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.organization_id = manifests.organization_id) AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))) 
  OR 
  (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.id = manifests.driver_id))))
);

-- Service role policy for system operations
CREATE POLICY "Service role manifest access" ON public.manifests
FOR ALL USING (true) WITH CHECK (true);