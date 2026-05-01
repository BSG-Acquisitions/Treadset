-- Add semi_count to manifests / pickups / dropoffs so semi tires (5 PTE)
-- can be tracked separately from farm-tractor / OTR tires (15 PTE).
--
-- Why: the wizard previously had only `tractor_count` and `otr_count`.
-- Users entering semi tires put them in `tractor_count`, and the wizard's
-- PTE math multiplied that by 5 (treating tractor as semi). The PDF
-- generator placed the same field in the OTR/Oversized bucket, which
-- multiplied by 15 — producing the symptom Justin reported on Harthun's
-- manifest (6 semi tires showing as 90 PTE on the printed PDF instead of
-- the correct 30 PTE).
--
-- BSG handles BOTH semi tires (5 PTE class) AND real farm-tractor + OTR
-- tires (15 PTE class), so we need separate fields, not a rename.
--
-- Reverses: see 99999999999999_revert_add_semi_count.sql (drop columns).

ALTER TABLE public.manifests
  ADD COLUMN IF NOT EXISTS semi_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.pickups
  ADD COLUMN IF NOT EXISTS semi_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.dropoffs
  ADD COLUMN IF NOT EXISTS semi_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.manifests.semi_count IS
  'Count of semi tires on this manifest. Each = 5 PTE (Michigan). Distinct from tractor_count (farm tractor, 15 PTE) and otr_count (OTR, 15 PTE).';

COMMENT ON COLUMN public.pickups.semi_count IS
  'Count of semi tires picked up. Each = 5 PTE.';

COMMENT ON COLUMN public.dropoffs.semi_count IS
  'Count of semi tires dropped off. Each = 5 PTE.';
