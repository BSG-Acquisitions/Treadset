-- Add missing foreign key constraint for hauler_id in manifests table
ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_hauler_id_fkey 
FOREIGN KEY (hauler_id) REFERENCES public.haulers(id);