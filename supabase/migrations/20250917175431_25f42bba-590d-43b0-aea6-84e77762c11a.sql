-- Add receiver signature path column to manifests so receiver signature upload works
ALTER TABLE public.manifests
ADD COLUMN IF NOT EXISTS receiver_sig_path text;

-- Optional: comment for clarity
COMMENT ON COLUMN public.manifests.receiver_sig_path IS 'Storage path to receiver signature PNG uploaded to manifests bucket';