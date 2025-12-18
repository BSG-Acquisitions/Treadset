-- Add signature tracking fields to dropoffs table
ALTER TABLE public.dropoffs 
ADD COLUMN IF NOT EXISTS hauler_sig_path TEXT,
ADD COLUMN IF NOT EXISTS hauler_signed_by TEXT,
ADD COLUMN IF NOT EXISTS hauler_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receiver_sig_path TEXT,
ADD COLUMN IF NOT EXISTS receiver_signed_by TEXT,
ADD COLUMN IF NOT EXISTS receiver_signed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.dropoffs.hauler_sig_path IS 'Storage path for hauler/generator signature PNG';
COMMENT ON COLUMN public.dropoffs.hauler_signed_by IS 'Name of person who signed as hauler/generator';
COMMENT ON COLUMN public.dropoffs.hauler_signed_at IS 'Timestamp when hauler/generator signed';
COMMENT ON COLUMN public.dropoffs.receiver_sig_path IS 'Storage path for receiver (BSG staff) signature PNG';
COMMENT ON COLUMN public.dropoffs.receiver_signed_by IS 'Name of BSG staff member who signed as receiver';
COMMENT ON COLUMN public.dropoffs.receiver_signed_at IS 'Timestamp when receiver signed';