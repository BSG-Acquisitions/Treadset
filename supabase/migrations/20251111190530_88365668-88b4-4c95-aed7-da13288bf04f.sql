-- Security Enhancement: Move pg_trgm Extension to Extensions Schema
-- Date: 2025-11-11
-- Purpose: Move pg_trgm from public schema to extensions schema per security best practices

-- Drop extension from public schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;

-- Create extension in extensions schema (if schema doesn't exist, create it first)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create extension in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;