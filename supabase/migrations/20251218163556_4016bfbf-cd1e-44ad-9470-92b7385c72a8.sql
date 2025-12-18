-- Add generator signature fields to dropoffs table for 3-signature workflow
ALTER TABLE dropoffs 
ADD COLUMN IF NOT EXISTS generator_sig_path TEXT,
ADD COLUMN IF NOT EXISTS generator_signed_by TEXT,
ADD COLUMN IF NOT EXISTS generator_signed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN dropoffs.generator_sig_path IS 'Storage path for generator signature image';
COMMENT ON COLUMN dropoffs.generator_signed_by IS 'Print name of person who signed as generator';
COMMENT ON COLUMN dropoffs.generator_signed_at IS 'Timestamp when generator signed';