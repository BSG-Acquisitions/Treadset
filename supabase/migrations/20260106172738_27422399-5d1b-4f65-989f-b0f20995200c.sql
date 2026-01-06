-- Add new tire estimate columns for detailed tire categories
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS tire_estimate_passenger_off_rim INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tire_estimate_passenger_on_rim INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tire_estimate_semi INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tire_estimate_oversized INTEGER DEFAULT 0;

-- Add comment to explain the columns
COMMENT ON COLUMN public.booking_requests.tire_estimate_passenger_off_rim IS 'Passenger tires without rims (1:1 PTE)';
COMMENT ON COLUMN public.booking_requests.tire_estimate_passenger_on_rim IS 'Passenger tires with rims (1:1 PTE)';
COMMENT ON COLUMN public.booking_requests.tire_estimate_semi IS 'Semi/commercial truck tires (5:1 PTE)';
COMMENT ON COLUMN public.booking_requests.tire_estimate_oversized IS 'OTR/Tractor/Heavy equipment tires (15:1 PTE)';