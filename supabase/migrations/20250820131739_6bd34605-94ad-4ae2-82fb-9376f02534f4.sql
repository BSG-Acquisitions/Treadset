-- Add foreign key constraints to client_workflows table for proper joins
ALTER TABLE public.client_workflows 
ADD CONSTRAINT fk_client_workflows_client 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.client_workflows 
ADD CONSTRAINT fk_client_workflows_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;