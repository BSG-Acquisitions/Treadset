-- Backfill revenue for completed manifests with tire counts but zero revenue
-- Uses standard Michigan tire rates: PTE = $25, OTR = $45, Tractor = $35

DO $$
DECLARE
  manifest_record RECORD;
  calculated_revenue NUMERIC;
BEGIN
  -- Find all completed manifests with tire data but no revenue
  FOR manifest_record IN
    SELECT 
      m.id as manifest_id,
      m.pickup_id,
      m.client_id,
      COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0) as pte_count,
      COALESCE(m.otr_count, 0) as otr_count,
      COALESCE(m.tractor_count, 0) as tractor_count,
      COALESCE(m.commercial_17_5_19_5_on, 0) + COALESCE(m.commercial_17_5_19_5_off, 0) as commercial_17_19_count,
      COALESCE(m.commercial_22_5_on, 0) + COALESCE(m.commercial_22_5_off, 0) as commercial_22_count
    FROM manifests m
    WHERE m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
      AND (m.total IS NULL OR m.total = 0)
      AND (
        COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0) +
        COALESCE(m.otr_count, 0) +
        COALESCE(m.tractor_count, 0) +
        COALESCE(m.commercial_17_5_19_5_on, 0) + COALESCE(m.commercial_17_5_19_5_off, 0) +
        COALESCE(m.commercial_22_5_on, 0) + COALESCE(m.commercial_22_5_off, 0)
      ) > 0
  LOOP
    -- Calculate revenue: PTE=$25, Semi/Tractor=$35, OTR=$45
    calculated_revenue := 
      (manifest_record.pte_count * 25.00) +
      (manifest_record.otr_count * 45.00) +
      (manifest_record.tractor_count * 35.00) +
      (manifest_record.commercial_17_19_count * 35.00) +
      (manifest_record.commercial_22_count * 35.00);

    -- Update manifest.total
    UPDATE manifests
    SET total = calculated_revenue,
        updated_at = now()
    WHERE id = manifest_record.manifest_id;

    -- Update pickup revenue fields if pickup exists
    IF manifest_record.pickup_id IS NOT NULL THEN
      UPDATE pickups
      SET 
        computed_revenue = calculated_revenue,
        final_revenue = calculated_revenue,
        updated_at = now()
      WHERE id = manifest_record.pickup_id
        AND (computed_revenue IS NULL OR computed_revenue = 0);
    END IF;

    RAISE NOTICE 'Updated manifest % with calculated revenue: $%', 
      manifest_record.manifest_id, calculated_revenue;
  END LOOP;
END $$;