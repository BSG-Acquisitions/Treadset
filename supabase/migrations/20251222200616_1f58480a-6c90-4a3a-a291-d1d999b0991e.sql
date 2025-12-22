-- Fix FK constraint: allow cascading deletes from booking_requests to booking_analytics
ALTER TABLE public.booking_analytics
DROP CONSTRAINT IF EXISTS booking_analytics_booking_request_id_fkey;

ALTER TABLE public.booking_analytics
ADD CONSTRAINT booking_analytics_booking_request_id_fkey
  FOREIGN KEY (booking_request_id)
  REFERENCES public.booking_requests(id)
  ON DELETE CASCADE;

-- Add RLS DELETE policy for booking_analytics so cascade works
DROP POLICY IF EXISTS booking_analytics_delete ON public.booking_analytics;

CREATE POLICY booking_analytics_delete
ON public.booking_analytics
FOR DELETE
USING (
  (current_setting('role'::text) = 'service_role'::text)
  OR EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = booking_analytics.organization_id
      AND uo.role = ANY (ARRAY['admin'::public.app_role, 'ops_manager'::public.app_role, 'dispatcher'::public.app_role, 'sales'::public.app_role])
  )
);