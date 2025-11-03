# Data Quality System Setup

## Overview
The data quality system automatically scans for incomplete records nightly and flags them for manual review.

## Components

### 1. Database Table: `data_quality_flags`
Stores all flagged data quality issues with the following fields:
- `record_type`: Type of record (client, pickup, manifest, location)
- `record_id`: UUID of the flagged record
- `issue`: Description of the data quality issue
- `severity`: Priority level (low, medium, high)
- `detected_at`: When the issue was first detected
- `resolved_at`: When marked as reviewed (null if unresolved)
- `resolved_by`: User who reviewed the issue
- `notes`: Optional resolution notes

### 2. Edge Function: `data-quality-scan`
Background process that scans for:
- **Clients**: Missing email, phone, or physical address
- **Locations**: Missing geocode data (latitude/longitude)
- **Pickups**: Missing geocode data for scheduled future pickups
- **Manifests**: Missing receiver signature or receiver name for completed manifests

### 3. Nightly Cron Job
**Schedule**: Every day at 2:00 AM EST
**Job Name**: `data-quality-nightly-scan`

To manually set up the cron job (admin access required):
```sql
SELECT cron.schedule(
  'data-quality-nightly-scan',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/data-quality-scan',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body:='{"triggered_at": "'||now()||'"}'::jsonb
  );
  $$
);
```

To check if cron job is active:
```sql
SELECT * FROM cron.job WHERE jobname = 'data-quality-nightly-scan';
```

To unschedule (if needed):
```sql
SELECT cron.unschedule('data-quality-nightly-scan');
```

### 4. Admin Dashboard
Access at: `/data-quality`

**Features**:
- View all unresolved issues with severity color coding
- Filter by severity (high/medium/low) and record type
- Search issues by description
- Quick links to view affected records
- Mark issues as reviewed with optional notes
- View history of resolved issues
- Manually trigger scans on-demand

### 5. Notifications
When new issues are detected:
- Low-priority in-app notifications sent to admins only
- No external emails or client notifications
- Notifications include count of new issues and link to dashboard

## Non-Destructive Design
**CRITICAL**: This system is read-only and non-destructive:
- ✅ Flags issues for manual review
- ✅ Provides context and links to records
- ✅ Tracks resolution history
- ❌ Does NOT auto-correct data
- ❌ Does NOT delete records
- ❌ Does NOT infer missing data
- ❌ Does NOT modify production data

## Testing in Sandbox
1. Enable sandbox mode via the TEST MODE toggle
2. Navigate to `/data-quality`
3. Click "Run Scan Now" to test detection
4. Verify issues are flagged correctly
5. Test mark as reviewed workflow
6. Confirm no data was modified

## Severity Guidelines

### High Priority
- Missing physical addresses (blocks routing)
- Missing geocode data (prevents driver assignment)
- Critical manifest fields for compliance

### Medium Priority
- Missing email addresses (blocks communication)
- Missing receiver signatures on completed manifests

### Low Priority
- Missing phone numbers
- Missing receiver names (informational only)

## Monitoring
- All scans logged to `system_updates` table
- Check `data_quality_flags` for trend analysis
- Monitor notification deliveries
- Review resolution rates by admin

## Manual Scan Trigger
Admins can trigger immediate scans via:
1. Dashboard button: "Run Scan Now"
2. Direct API call to `data-quality-scan` edge function
3. SQL: `SELECT net.http_post(...)`

## Performance Notes
- Nightly scans typically complete in < 30 seconds
- Indexes optimize queries for large datasets
- Background processing doesn't impact user experience
- Duplicate detection prevents notification spam
