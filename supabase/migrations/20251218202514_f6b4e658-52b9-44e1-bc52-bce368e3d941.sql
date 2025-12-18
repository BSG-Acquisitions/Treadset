-- Add is_licensed_hauler flag to distinguish licensed haulers from drop-off customers
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS is_licensed_hauler boolean DEFAULT false;

-- Set licensed haulers based on the confirmed list
UPDATE public.haulers SET is_licensed_hauler = true 
WHERE hauler_name IN (
  'BSG Tire Recycling',
  'Don J Transport LLC',
  'Jody Green',
  'JNJ Tire Recycling',
  'Sterling Sanitation Inc.'
);

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_haulers_is_licensed ON public.haulers(is_licensed_hauler) WHERE is_active = true;