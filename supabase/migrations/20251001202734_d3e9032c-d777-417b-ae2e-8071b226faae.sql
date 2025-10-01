-- Enable real-time updates for pickups table
ALTER TABLE public.pickups REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.pickups;

-- Enable real-time updates for clients table
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.clients;

-- Enable real-time updates for vehicles table
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.vehicles;

-- Enable real-time updates for assignments table
ALTER TABLE public.assignments REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.assignments;

-- Enable real-time updates for manifests table
ALTER TABLE public.manifests REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.manifests;

-- Enable real-time updates for client_summaries table
ALTER TABLE public.client_summaries REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.client_summaries;