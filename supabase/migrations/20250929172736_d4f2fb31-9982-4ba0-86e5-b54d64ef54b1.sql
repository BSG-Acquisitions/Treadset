-- Add driver assignment to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS driver_email TEXT;

-- Create index for better performance when filtering vehicles by driver
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON public.vehicles(assigned_driver_id);

-- Add comment to explain the relationship
COMMENT ON COLUMN public.vehicles.assigned_driver_id IS 'The driver (user) assigned to this vehicle';
COMMENT ON COLUMN public.vehicles.driver_email IS 'Email of the assigned driver for easy reference';