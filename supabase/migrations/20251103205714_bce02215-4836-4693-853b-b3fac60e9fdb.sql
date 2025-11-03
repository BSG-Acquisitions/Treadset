-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Enable pg_net extension for HTTP requests from cron
CREATE EXTENSION IF NOT EXISTS pg_net;

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';
COMMENT ON EXTENSION pg_net IS 'Async HTTP client for PostgreSQL';