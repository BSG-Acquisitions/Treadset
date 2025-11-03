# Revenue Forecasting - Manual Setup Required

## 🚨 Action Required

The revenue forecasting engine is deployed and ready, but requires manual setup for two items:

### 1. Log System Update

Run this SQL in the Supabase SQL Editor:

```sql
INSERT INTO system_updates (module_name, status, notes, impacted_tables, organization_id)
SELECT 
  'Revenue Forecasting Engine',
  'live',
  'AI-powered revenue forecasting with 30/60/90-day projections, rolling averages, seasonal weights, confidence intervals, CSV export, and nightly refresh at midnight.',
  ARRAY['revenue_forecasts_beta', 'manifests', 'pickups'],
  id
FROM organizations
LIMIT 1;
```

### 2. Schedule Nightly Refresh

Run this SQL in the Supabase SQL Editor to set up automatic nightly forecast updates at midnight:

```sql
SELECT cron.schedule(
  'nightly-revenue-forecast',
  '0 0 * * *', -- Midnight daily
  $$
  SELECT
    net.http_post(
      url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/calculate-revenue-forecast',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

### 3. Verify Cron Job

Check that the job was created successfully:

```sql
SELECT * FROM cron.job 
WHERE jobname = 'nightly-revenue-forecast';
```

### 4. Initial Data Generation

Manually trigger the first forecast calculation:

```sql
SELECT
  net.http_post(
    url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/calculate-revenue-forecast',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

## Verification

After setup:

1. Check the dashboard at `/` - you should see the "Projected Revenue" widget
2. Verify data in `revenue_forecasts_beta` table:
```sql
SELECT * FROM revenue_forecasts_beta 
ORDER BY forecast_month;
```

## What's Already Deployed

✅ Edge function: `calculate-revenue-forecast`
✅ UI Widget: `ProjectedRevenueWidget` on main dashboard
✅ Database table: `revenue_forecasts_beta`
✅ React hooks: `useRevenueForecasts`
✅ CSV export functionality
✅ Date range selection (30/60/90 days)

## Documentation

See `REVENUE_FORECASTING_SETUP.md` for complete technical documentation.
