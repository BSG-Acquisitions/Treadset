ALTER TABLE public.trailer_route_stops 
ADD COLUMN planned_events jsonb DEFAULT '[]';