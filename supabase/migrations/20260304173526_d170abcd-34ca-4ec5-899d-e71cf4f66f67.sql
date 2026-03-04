-- Allow assigned drivers to UPDATE their own trailer routes (start/complete)
CREATE POLICY "driver_update_own_trailer_routes"
ON public.trailer_routes
FOR UPDATE
USING (
  driver_id IN (
    SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
  )
);

-- Allow assigned drivers to UPDATE stops on their own routes (mark complete)
CREATE POLICY "driver_update_own_route_stops"
ON public.trailer_route_stops
FOR UPDATE
USING (
  route_id IN (
    SELECT tr.id FROM public.trailer_routes tr
    WHERE tr.driver_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  route_id IN (
    SELECT tr.id FROM public.trailer_routes tr
    WHERE tr.driver_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  )
);