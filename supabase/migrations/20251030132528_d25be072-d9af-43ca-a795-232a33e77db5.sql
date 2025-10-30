-- Add payment_method column to pickups table to track offline payments (cash/check)
ALTER TABLE public.pickups 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CARD';

-- Add payment_status column if it doesn't exist (for consistency with manifest handling)
ALTER TABLE public.pickups 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';

-- Add check constraint to ensure valid payment methods
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_payment_method_check 
CHECK (payment_method IN ('CARD', 'CASH', 'CHECK', 'ACH', 'WIRE'));

-- Add check constraint for payment status
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_payment_status_check 
CHECK (payment_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'));