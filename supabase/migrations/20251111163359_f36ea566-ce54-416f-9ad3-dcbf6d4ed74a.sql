-- Drop the old constraint
ALTER TABLE pickups DROP CONSTRAINT IF EXISTS pickups_payment_method_check;

-- Add updated constraint with all payment methods
ALTER TABLE pickups ADD CONSTRAINT pickups_payment_method_check 
CHECK (payment_method IN ('CASH', 'CARD', 'CARD_ON_FILE', 'CHECK', 'INVOICE', 'STRIPE'));
