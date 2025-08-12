-- Find and fix any remaining security definer views
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%';