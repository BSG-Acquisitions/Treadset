ALTER TABLE public.trailer_routes
  ADD COLUMN trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL;

CREATE INDEX idx_trailer_routes_trailer_id ON public.trailer_routes(trailer_id);