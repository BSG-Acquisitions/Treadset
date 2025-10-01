-- Add weight columns to manifests table
ALTER TABLE public.manifests 
ADD COLUMN IF NOT EXISTS gross_weight_lbs NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tare_weight_lbs NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_weight_lbs NUMERIC(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.manifests.gross_weight_lbs IS 'Gross weight in pounds (total weight including vehicle)';
COMMENT ON COLUMN public.manifests.tare_weight_lbs IS 'Tare weight in pounds (vehicle weight)';
COMMENT ON COLUMN public.manifests.net_weight_lbs IS 'Net weight in pounds (cargo weight only)';