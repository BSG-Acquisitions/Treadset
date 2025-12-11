-- Delete duplicate active followup workflows, keeping only the most recent one per client
DELETE FROM client_workflows
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM client_workflows
  WHERE workflow_type = 'followup' AND status = 'active'
  ORDER BY client_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
AND workflow_type = 'followup'
AND status = 'active';

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_followup_per_client 
ON client_workflows (client_id, workflow_type, status) 
WHERE status = 'active' AND workflow_type = 'followup';