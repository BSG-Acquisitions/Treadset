ALTER TABLE public.assignments 
  ADD COLUMN trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_trailer_id ON public.assignments(trailer_id);