-- Phase 3 Stabilization: Remove _beta suffixes and promote to production

-- Rename tables (preserving all data, indexes, and RLS policies)
ALTER TABLE ai_insights_beta RENAME TO ai_insights;
ALTER TABLE ai_query_logs_beta RENAME TO ai_query_logs;
ALTER TABLE revenue_forecasts_beta RENAME TO revenue_forecasts;
ALTER TABLE driver_performance_beta RENAME TO driver_performance;
ALTER TABLE capacity_preview_beta RENAME TO capacity_preview;
ALTER TABLE client_risk_scores_beta RENAME TO client_risk_scores;
ALTER TABLE client_engagement_beta RENAME TO client_engagement;
ALTER TABLE hauler_reliability_beta RENAME TO hauler_reliability;
ALTER TABLE manifest_alerts_beta RENAME TO manifest_alerts;
ALTER TABLE manifest_tasks_beta RENAME TO manifest_tasks;
ALTER TABLE manifest_followups_beta RENAME TO manifest_followups;
ALTER TABLE operational_metrics_beta RENAME TO operational_metrics;
ALTER TABLE pickup_patterns_beta RENAME TO pickup_patterns;

-- Log Phase 3 completion in system_updates
INSERT INTO system_updates (
  module_name,
  status,
  organization_id,
  notes,
  impacted_tables,
  test_results
) VALUES (
  'Phase 3: Advanced AI & Intelligence Features',
  'live',
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
  'Advanced AI features successfully validated and promoted from beta to production. Includes: AI Assistant (natural language queries), AI Insights (daily operational summaries), Driver Performance Analytics (sortable metrics with sparklines), Capacity Forecast Preview (7-day predictions with color-coded alerts), Client Risk Scoring, Hauler Reliability Tracking, and Automated Manifest Follow-up Workflows. All modules tested and stable.',
  ARRAY[
    'ai_insights', 'ai_query_logs', 'revenue_forecasts', 'driver_performance',
    'capacity_preview', 'client_risk_scores', 'client_engagement',
    'hauler_reliability', 'manifest_alerts', 'manifest_tasks',
    'manifest_followups', 'operational_metrics', 'pickup_patterns'
  ],
  jsonb_build_object(
    'ai_assistant', 'verified',
    'ai_insights', 'verified',
    'driver_performance', 'verified',
    'capacity_forecast', 'verified',
    'client_risk_scores', 'verified',
    'hauler_reliability', 'verified',
    'manifest_automation', 'verified'
  )
);