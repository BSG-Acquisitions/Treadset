-- Schedule manifest follow-up automation to run daily at 2:00 AM EST
SELECT cron.schedule(
  'manifest-followup-automation',
  '0 7 * * *', -- 7 AM UTC = 2 AM EST
  $$
  SELECT
    net.http_post(
        url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/manifest-followup-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Schedule data quality scan to run nightly at 3:00 AM EST
SELECT cron.schedule(
  'data-quality-scan',
  '0 8 * * *', -- 8 AM UTC = 3 AM EST
  $$
  SELECT
    net.http_post(
        url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/data-quality-scan',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);