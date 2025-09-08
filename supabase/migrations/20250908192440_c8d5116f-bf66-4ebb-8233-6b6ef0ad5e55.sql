-- Create templates bucket if needed
INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Update manifests bucket to be public for better access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'manifests';

-- Create RLS policies for templates bucket
CREATE POLICY "Templates are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can upload templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'templates' AND auth.uid() IS NOT NULL);

-- Create RLS policies for manifest files
CREATE POLICY "Manifests viewable by organization members" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manifests');

CREATE POLICY "Authenticated users can create manifests" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'manifests' AND auth.uid() IS NOT NULL);