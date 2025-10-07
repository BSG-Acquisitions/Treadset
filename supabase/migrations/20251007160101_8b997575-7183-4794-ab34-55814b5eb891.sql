-- Add county column to hauler_customers table
ALTER TABLE public.hauler_customers 
ADD COLUMN county text;