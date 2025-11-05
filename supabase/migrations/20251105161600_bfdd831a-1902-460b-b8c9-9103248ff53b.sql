-- Create SQL function to mirror Michigan PTE conversion logic
CREATE OR REPLACE FUNCTION public.calculate_total_pte(
  p_pte_count INTEGER,
  p_otr_count INTEGER,
  p_tractor_count INTEGER
) RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT 
    COALESCE(p_pte_count, 0) * 1 +     -- Passenger tires: 1:1
    COALESCE(p_otr_count, 0) * 15 +    -- OTR tires: 1:15
    COALESCE(p_tractor_count, 0) * 5;  -- Tractor/Semi tires: 1:5
$$;

-- Create unified recycling events view (single source of truth)
-- This view ensures NO double counting by:
-- 1. Including COMPLETED manifests as the canonical source
-- 2. Including dropoffs ONLY if they don't have a COMPLETED manifest
-- 3. Including pickups ONLY if they don't have any manifest
CREATE OR REPLACE VIEW public.recycling_events AS
-- 1. Manifests (canonical source when they exist and are completed)
SELECT 
  m.id::TEXT || '_manifest' as event_id,
  'manifest' as source_type,
  m.id as source_id,
  m.organization_id,
  COALESCE(m.signed_at, m.created_at)::DATE as event_date,
  COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0) as pte_count,
  COALESCE(m.otr_count, 0) as otr_count,
  COALESCE(m.tractor_count, 0) as tractor_count,
  public.calculate_total_pte(
    COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0),
    COALESCE(m.otr_count, 0),
    COALESCE(m.tractor_count, 0)
  ) as pte_equivalent,
  m.client_id,
  m.pickup_id
FROM public.manifests m
WHERE m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')

UNION ALL

-- 2. Dropoffs WITHOUT a completed manifest (to avoid double counting)
SELECT 
  d.id::TEXT || '_dropoff' as event_id,
  'dropoff' as source_type,
  d.id as source_id,
  d.organization_id,
  d.dropoff_date as event_date,
  COALESCE(d.pte_count, 0) as pte_count,
  COALESCE(d.otr_count, 0) as otr_count,
  COALESCE(d.tractor_count, 0) as tractor_count,
  public.calculate_total_pte(
    COALESCE(d.pte_count, 0),
    COALESCE(d.otr_count, 0),
    COALESCE(d.tractor_count, 0)
  ) as pte_equivalent,
  NULL::UUID as client_id,
  NULL::UUID as pickup_id
FROM public.dropoffs d
WHERE d.status IN ('completed', 'processed')
  AND (
    d.manifest_id IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM public.manifests m2
      WHERE m2.id = d.manifest_id 
      AND m2.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
    )
  )

UNION ALL

-- 3. Pickups WITHOUT any manifest (to avoid double counting)
SELECT 
  p.id::TEXT || '_pickup' as event_id,
  'pickup' as source_type,
  p.id as source_id,
  p.organization_id,
  p.pickup_date as event_date,
  COALESCE(p.pte_count, 0) as pte_count,
  COALESCE(p.otr_count, 0) as otr_count,
  COALESCE(p.tractor_count, 0) as tractor_count,
  public.calculate_total_pte(
    COALESCE(p.pte_count, 0),
    COALESCE(p.otr_count, 0),
    COALESCE(p.tractor_count, 0)
  ) as pte_equivalent,
  p.client_id,
  p.id as pickup_id
FROM public.pickups p
WHERE p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.manifests m3
    WHERE m3.pickup_id = p.id
  );

-- Grant access to authenticated users (RLS on base tables still applies)
GRANT SELECT ON public.recycling_events TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.recycling_events IS 
'Unified view of all PTE-bearing recycling events. Eliminates double counting by prioritizing: 
1) Completed manifests (canonical source)
2) Dropoffs without completed manifests
3) Pickups without any manifests.
Use this as the single source of truth for all PTE reporting.';