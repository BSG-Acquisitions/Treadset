ALTER TABLE public.trailers
  DROP CONSTRAINT trailers_last_event_fkey;

ALTER TABLE public.trailers
  ADD CONSTRAINT trailers_last_event_fkey
  FOREIGN KEY (last_event_id) REFERENCES public.trailer_events(id)
  ON DELETE SET NULL;