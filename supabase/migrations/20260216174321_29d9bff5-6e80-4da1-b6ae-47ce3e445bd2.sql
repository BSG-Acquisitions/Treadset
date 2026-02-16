
-- Add CARD_ON_FILE to manifests payment_method check constraint to match pickups
ALTER TABLE manifests DROP CONSTRAINT manifests_payment_method_check;
ALTER TABLE manifests ADD CONSTRAINT manifests_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['CARD'::text, 'INVOICE'::text, 'CASH'::text, 'CHECK'::text, 'CARD_ON_FILE'::text]));

-- Now repair historical data: sync manifest payment methods with pickup truth
UPDATE manifests m
SET payment_method = p.payment_method,
    check_number = COALESCE(m.check_number, p.check_number)
FROM pickups p
WHERE m.pickup_id = p.id
  AND p.payment_method IS NOT NULL
  AND m.payment_method IS DISTINCT FROM p.payment_method;
