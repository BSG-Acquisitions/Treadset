-- Update the vehicle name from "Brenner Whitt - Active Truck" to "RMH"
UPDATE public.vehicles 
SET 
  name = 'RMH',
  updated_at = now()
WHERE name = 'Brenner Whitt - Active Truck';