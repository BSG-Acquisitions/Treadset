-- Add driver_id field to assignments table for driver assignment tracking
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.users(id);

-- Add index for better performance when querying by driver
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id ON public.assignments(driver_id);

-- Update RLS policies to include driver access
DROP POLICY IF EXISTS "Drivers can view their assigned routes" ON public.assignments;
CREATE POLICY "Drivers can view their assigned routes"
ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = assignments.organization_id
      AND uo.role = 'driver'
      AND u.id = assignments.driver_id
  )
);

-- Allow drivers to update their assignment status
DROP POLICY IF EXISTS "Drivers can update their assignments" ON public.assignments;
CREATE POLICY "Drivers can update their assignments"
ON public.assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = assignments.organization_id
      AND uo.role = 'driver'
      AND u.id = assignments.driver_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = assignments.organization_id
      AND uo.role = 'driver'
      AND u.id = assignments.driver_id
  )
);