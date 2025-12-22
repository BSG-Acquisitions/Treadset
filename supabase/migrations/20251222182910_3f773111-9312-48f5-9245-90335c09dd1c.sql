-- Allow authorized org staff (and service role) to delete booking requests
-- This fixes “delete succeeds but row remains” when RLS blocks DELETE (0 rows affected).

DROP POLICY IF EXISTS booking_requests_delete ON public.booking_requests;

CREATE POLICY booking_requests_delete
ON public.booking_requests
FOR DELETE
USING (
  (current_setting('role'::text) = 'service_role'::text)
  OR EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = booking_requests.organization_id
      AND uo.role = ANY (ARRAY['admin'::public.app_role, 'ops_manager'::public.app_role, 'dispatcher'::public.app_role, 'sales'::public.app_role])
  )
);
