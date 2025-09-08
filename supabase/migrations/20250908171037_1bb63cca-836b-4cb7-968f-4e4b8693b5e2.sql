-- Fix route-planner function access by ensuring service role can access required tables

-- Add service role bypass policies for locations table
DROP POLICY IF EXISTS "Service role can access locations" ON public.locations;
CREATE POLICY "Service role can access locations"
ON public.locations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add service role bypass policies for vehicles table  
DROP POLICY IF EXISTS "Service role can access vehicles" ON public.vehicles;
CREATE POLICY "Service role can access vehicles"
ON public.vehicles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add service role bypass policies for assignments table
DROP POLICY IF EXISTS "Service role can access assignments" ON public.assignments;
CREATE POLICY "Service role can access assignments"
ON public.assignments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add service role bypass policies for pickups table
DROP POLICY IF EXISTS "Service role can access pickups" ON public.pickups;
CREATE POLICY "Service role can access pickups"
ON public.pickups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);