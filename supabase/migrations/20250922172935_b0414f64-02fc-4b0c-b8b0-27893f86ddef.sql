-- Add missing foreign key constraints for manifests table
ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id);

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_location_id_fkey 
FOREIGN KEY (location_id) REFERENCES public.locations(id);

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_pickup_id_fkey 
FOREIGN KEY (pickup_id) REFERENCES public.pickups(id);

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.users(id);

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);

ALTER TABLE public.manifests 
ADD CONSTRAINT manifests_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id);