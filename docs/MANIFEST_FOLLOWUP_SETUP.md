# Advanced Manifest Follow-Up Automation Setup

## Overview
The advanced follow-up system automatically creates tasks, escalates to appropriate roles, and sends alerts based on manifest completion status.

## How It Works

### Automatic Task Creation (Day 3)
When a manifest remains incomplete for **72+ hours**:
- Creates a task in `manifest_tasks_beta`
- Assigns to Receptionist (or Ops Manager if no receptionist)
- Sends reminder notification
- Records action in `manifest_followups_beta`

### Escalation Chain

**Day 5 - Ops Manager Escalation**
- Task reassigned to Ops Manager
- Status changed to "escalated"
- Priority raised to "high"
- Notification sent to Ops Manager

**Day 7 - High Priority Alert**
- All Admins and Ops Managers notified
- Marked as "⚠️ High Priority Manifest"
- Maximum escalation level reached

## One-Click Actions

Available in Notification Center for manifest-related notifications:
- **[Open Manifest]** - Navigate directly to manifest list
- **[Mark Resolved]** - Close task and record resolution notes

## Audit Trail

All actions recorded in `manifest_followups_beta`:
- reminder_sent
- task_created
- task_escalated
- task_resolved
- alert_sent

## Daily Automation

### Setup Cron Job (Midnight)

Run this SQL to schedule daily automation:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily run at midnight
SELECT cron.schedule(
  'manifest-followup-automation',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/manifest-followup-automation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

### Manual Trigger

For testing or immediate execution:

```sql
SELECT net.http_post(
  url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/manifest-followup-automation',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY"}'::jsonb,
  body:='{}'::jsonb
);
```

## Testing

1. Create a test manifest with DRAFT status dated 4 days ago
2. Run manual trigger SQL above
3. Check notifications for task creation
4. Verify task appears in notification center with one-click actions
5. Test "Mark Resolved" button

## No Impact on Existing Flows

✅ **Confirmed No Changes To:**
- Manifest creation workflow
- Manifest submission flow
- Driver assignment
- PDF generation
- Email delivery
- Payment processing

Only adds:
- Automated background task creation
- Escalation notifications
- Resolution tracking

## Role Permissions

**Can View Tasks:**
- Admin
- Ops Manager
- Receptionist
- Assigned user

**Can Resolve Tasks:**
- Admin
- Ops Manager
- Assigned user

## Monitoring

Check automation runs:
```sql
SELECT * FROM system_updates 
WHERE module_name = 'manifest_followup_automation'
ORDER BY created_at DESC
LIMIT 10;
```

View active tasks:
```sql
SELECT * FROM manifest_tasks_beta
WHERE status IN ('pending', 'in_progress', 'escalated')
ORDER BY priority DESC, days_overdue DESC;
```

Review audit trail:
```sql
SELECT * FROM manifest_followups_beta
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```
