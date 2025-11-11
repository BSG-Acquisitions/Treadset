-- Consolidate manifests table policies (most complex table)

-- Drop all existing manifest policies
DROP POLICY IF EXISTS "Admins can delete manifests" ON public.manifests;
DROP POLICY IF EXISTS "Admins can manage manifests" ON public.manifests;
DROP POLICY IF EXISTS "Enhanced manifest insert" ON public.manifests;
DROP POLICY IF EXISTS "Enhanced manifest update" ON public.manifests;
DROP POLICY IF EXISTS "Service role manifest access" ON public.manifests;
DROP POLICY IF EXISTS "Users can view manifests" ON public.manifests;
DROP POLICY IF EXISTS "Users can update manifests" ON public.manifests;
DROP POLICY IF EXISTS "manifests_select_policy" ON public.manifests;

-- Create single consolidated policy per action
CREATE POLICY "manifests_select" ON public.manifests
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )) OR
  (hauler_id IN (
    SELECT h.id
    FROM haulers h
    WHERE h.user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
  ))
);

CREATE POLICY "manifests_insert" ON public.manifests
FOR INSERT WITH CHECK (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'driver'::app_role, 'dispatcher'::app_role])
  ))
);

CREATE POLICY "manifests_update" ON public.manifests
FOR UPDATE USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'driver'::app_role, 'dispatcher'::app_role])
  )) OR
  (hauler_id IN (
    SELECT h.id
    FROM haulers h
    WHERE h.user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
  ))
);

CREATE POLICY "manifests_delete" ON public.manifests
FOR DELETE USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifests.organization_id
      AND uo.role = 'admin'::app_role
  ))
);