-- Add hauler_id column to manifests table and create foreign key constraint
ALTER TABLE public.manifests 
ADD COLUMN hauler_id uuid;

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_hauler_id_fkey 
FOREIGN KEY (hauler_id) REFERENCES public.haulers(id);