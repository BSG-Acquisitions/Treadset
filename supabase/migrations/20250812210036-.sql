-- Populate revenue data for existing client summaries based on PTE counts
-- This will make the analytics dashboard show meaningful revenue figures

-- Update existing client summaries with calculated revenue based on tire counts
UPDATE public.client_summaries
SET total_revenue = (
  (COALESCE(total_ptes, 0) * 2.75) +     -- Passenger tires at $2.75 each
  (COALESCE(total_otr, 0) * 16.00) +     -- Commercial OTR tires at $16.00 each  
  (COALESCE(total_tractor, 0) * 35.00) + -- Tractor tires at $35.00 each
  (COALESCE(total_pickups, 0) * 15.00) + -- Base pickup fee of $15 per pickup
  (COALESCE(total_pickups, 0) * 0.25 * 5.00) -- Rim surcharge on 25% of pickups
)
WHERE organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
AND (total_revenue = 0 OR total_revenue IS NULL);

-- Update pickup records with computed revenue
UPDATE public.pickups 
SET 
  computed_revenue = (
    (COALESCE(pte_count, 0) * 2.75) +
    (COALESCE(otr_count, 0) * 16.00) +
    (COALESCE(tractor_count, 0) * 35.00) +
    15.00 + -- Base pickup fee
    (CASE WHEN pte_count > 0 THEN pte_count * 0.25 * 5.00 ELSE 0 END) -- Rim surcharge
  ),
  final_revenue = (
    (COALESCE(pte_count, 0) * 2.75) +
    (COALESCE(otr_count, 0) * 16.00) +
    (COALESCE(tractor_count, 0) * 35.00) +
    15.00 +
    (CASE WHEN pte_count > 0 THEN pte_count * 0.25 * 5.00 ELSE 0 END)
  ),
  estimated_revenue = (
    (COALESCE(pte_count, 0) * 2.75) +
    (COALESCE(otr_count, 0) * 16.00) +
    (COALESCE(tractor_count, 0) * 35.00) +
    15.00 +
    (CASE WHEN pte_count > 0 THEN pte_count * 0.25 * 5.00 ELSE 0 END)
  )
WHERE organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
AND (computed_revenue = 0 OR computed_revenue IS NULL);

-- Update client lifetime revenue based on their summary totals
UPDATE public.clients 
SET lifetime_revenue = (
  SELECT COALESCE(SUM(cs.total_revenue), 0)
  FROM public.client_summaries cs 
  WHERE cs.client_id = clients.id
  AND cs.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
)
WHERE organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73';