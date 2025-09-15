-- Add hauler_id field to assignments table to support external hauler assignments
ALTER TABLE public.assignments 
ADD COLUMN hauler_id UUID REFERENCES public.haulers(id);

-- Update the constraint so either vehicle_id OR hauler_id must be set, but not both
ALTER TABLE public.assignments 
DROP CONSTRAINT IF EXISTS assignments_vehicle_id_not_null;

-- Add constraint to ensure either vehicle_id or hauler_id is set (but not both)
ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_vehicle_or_hauler_check 
CHECK (
  (vehicle_id IS NOT NULL AND hauler_id IS NULL) OR 
  (vehicle_id IS NULL AND hauler_id IS NOT NULL)
);