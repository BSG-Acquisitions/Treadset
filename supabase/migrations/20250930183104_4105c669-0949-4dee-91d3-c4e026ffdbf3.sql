-- Fix manifests status check to include receiver-waiting status
ALTER TABLE public.manifests DROP CONSTRAINT IF EXISTS manifests_status_check;
ALTER TABLE public.manifests 
  ADD CONSTRAINT manifests_status_check 
  CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'AWAITING_SIGNATURE', 'AWAITING_PAYMENT', 'AWAITING_RECEIVER_SIGNATURE', 'COMPLETED'));

-- Keep default consistent
ALTER TABLE public.manifests ALTER COLUMN status SET DEFAULT 'DRAFT';