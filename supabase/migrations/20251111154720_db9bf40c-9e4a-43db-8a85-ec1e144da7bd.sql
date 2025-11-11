-- Schedule pattern analysis to run daily at 2 AM
SELECT cron.schedule(
  'analyze-pickup-patterns-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/analyze-pickup-patterns',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
        body:=jsonb_build_object('organization_id', org.id)
    ) as request_id
  FROM organizations org;
  $$
);

-- Schedule missing pickup check to run daily at 8 AM
SELECT cron.schedule(
  'check-missing-pickups-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/check-missing-pickups',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
        body:=jsonb_build_object('organization_id', org.id)
    ) as request_id
  FROM organizations org;
  $$
);