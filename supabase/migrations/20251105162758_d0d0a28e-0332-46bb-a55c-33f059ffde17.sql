-- Roll back recycling_events view and calculate_total_pte function

-- Drop the view
DROP VIEW IF EXISTS public.recycling_events;

-- Drop the function
DROP FUNCTION IF EXISTS public.calculate_total_pte(integer, integer, integer);