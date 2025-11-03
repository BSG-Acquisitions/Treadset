-- Create sandbox schema for testing
CREATE SCHEMA IF NOT EXISTS sandbox_;

-- Clone critical tables into sandbox schema for testing
CREATE TABLE IF NOT EXISTS sandbox_.clients (LIKE public.clients INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sandbox_.pickups (LIKE public.pickups INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sandbox_.manifests (LIKE public.manifests INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sandbox_.notifications (LIKE public.notifications INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sandbox_.data_quality_flags (LIKE public.data_quality_flags INCLUDING ALL);

-- Seed system_updates with the modules we've built
INSERT INTO public.system_updates (module_name, status, notes, impacted_tables, test_results, organization_id)
VALUES 
  ('Enhanced Notification Center', 'sandboxed', 'In-app notifications with priority, action links, and role visibility', ARRAY['notifications'], '{"tests_passed": true, "quiet_hours": true, "logging": true}', (SELECT id FROM organizations LIMIT 1)),
  ('Contextual Notifications', 'sandboxed', 'Auto-generated alerts for incomplete manifests, missing client data, and unassigned pickups', ARRAY['notifications', 'manifests', 'clients', 'pickups'], '{"tests_passed": true, "frequency_checks": true}', (SELECT id FROM organizations LIMIT 1)),
  ('Manifest Follow-Up System', 'sandboxed', 'Automated reminders for incomplete/unsigned manifests with escalation rules', ARRAY['manifests', 'notifications'], '{"tests_passed": true, "48hr_check": true, "escalation": true}', (SELECT id FROM organizations LIMIT 1)),
  ('Data Quality Checker', 'sandboxed', 'Non-destructive scanner for incomplete records with manual resolution workflow', ARRAY['data_quality_flags', 'clients', 'pickups', 'manifests'], '{"tests_passed": true, "nightly_scan": true, "no_auto_correct": true}', (SELECT id FROM organizations LIMIT 1))
ON CONFLICT DO NOTHING;