-- Add RLS policies for generators table to allow CRUD operations

-- Allow authenticated users to insert generators (for dropoff processing)
CREATE POLICY "Allow authenticated users to insert generators"
ON public.generators
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update generators
CREATE POLICY "Allow authenticated users to update generators"
ON public.generators
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete (deactivate) generators
CREATE POLICY "Allow authenticated users to delete generators"
ON public.generators
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);