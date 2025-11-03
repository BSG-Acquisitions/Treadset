-- Attach triggers to keep client stats and summaries live
DO $$ BEGIN
  -- Pickups -> update client stats on completion
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pickups_update_client_stats'
  ) THEN
    DROP TRIGGER trg_pickups_update_client_stats ON public.pickups;
  END IF;
  CREATE TRIGGER trg_pickups_update_client_stats
  AFTER INSERT OR UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_client_stats_on_pickup_completion();

  -- Pickups -> update client monthly summaries
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pickups_update_client_summary'
  ) THEN
    DROP TRIGGER trg_pickups_update_client_summary ON public.pickups;
  END IF;
  CREATE TRIGGER trg_pickups_update_client_summary
  AFTER INSERT OR UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_client_summary_from_pickup();

  -- Manifests -> keep client last_manifest_at in sync
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_manifests_update_client_stats'
  ) THEN
    DROP TRIGGER trg_manifests_update_client_stats ON public.manifests;
  END IF;
  CREATE TRIGGER trg_manifests_update_client_stats
  AFTER INSERT OR UPDATE ON public.manifests
  FOR EACH ROW EXECUTE FUNCTION public.update_client_stats_on_manifest_completion();
END $$;