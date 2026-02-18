import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ManifestIssue {
  code: string;
  label: string;
  severity: "error" | "warning";
}

export interface ManifestHealthRecord {
  id: string;
  manifest_number: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  client_name: string;
  client_city: string | null;
  client_state: string | null;
  has_generator_sig: boolean;
  has_hauler_sig: boolean;
  has_receiver_sig: boolean;
  signed_by_name: string | null;
  signed_by_title: string | null;
  generator_signed_at: string | null;
  hauler_signed_at: string | null;
  receiver_signed_at: string | null;
  issues: ManifestIssue[];
  health_score: number; // 0-100
}

function detectIssues(manifest: any, client: any): ManifestIssue[] {
  const issues: ManifestIssue[] = [];

  if (!manifest.customer_signature_png_path) {
    issues.push({ code: "no_gen_sig", label: "Missing generator signature", severity: "error" });
  }
  if (!manifest.driver_signature_png_path) {
    issues.push({ code: "no_haul_sig", label: "Missing hauler signature", severity: "error" });
  }
  if (!manifest.signed_by_name || manifest.signed_by_name.trim() === "") {
    issues.push({ code: "no_gen_name", label: "Generator name blank", severity: "error" });
  }
  if (!manifest.signed_by_title || manifest.signed_by_title.trim() === "") {
    issues.push({ code: "no_haul_name", label: "Hauler name blank", severity: "warning" });
  }
  if (!manifest.generator_signed_at) {
    issues.push({ code: "no_gen_ts", label: "Generator timestamp missing", severity: "warning" });
  }
  if (!manifest.hauler_signed_at) {
    issues.push({ code: "no_haul_ts", label: "Hauler timestamp missing", severity: "warning" });
  }
  if (!client?.city || client.city.trim() === "") {
    issues.push({ code: "no_city", label: "Client city blank", severity: "warning" });
  }
  if (manifest.status === "COMPLETED" && !manifest.receiver_signed_at) {
    issues.push({ code: "no_recv_ts", label: "No receiver timestamp (COMPLETED)", severity: "error" });
  }

  return issues;
}

function computeHealthScore(issues: ManifestIssue[]): number {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const penalty = errorCount * 20 + warnCount * 8;
  return Math.max(0, 100 - penalty);
}

export function useManifestHealthScan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["manifest-health-scan", user?.currentOrganization?.id],
    queryFn: async (): Promise<ManifestHealthRecord[]> => {
      const orgId = user?.currentOrganization?.id;
      if (!orgId) return [];

      // Fetch manifests with only needed fields
      const { data: manifests, error } = await supabase
        .from("manifests")
        .select(
          `id, manifest_number, status, created_at, signed_at,
           customer_signature_png_path, driver_signature_png_path, receiver_sig_path,
           signed_by_name, signed_by_title,
           generator_signed_at, hauler_signed_at, receiver_signed_at,
           client_id`
        )
        .eq("organization_id", orgId)
        .in("status", ["AWAITING_RECEIVER_SIGNATURE", "COMPLETED"])
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!manifests || manifests.length === 0) return [];

      // Fetch all relevant clients in one query
      const clientIds = [...new Set(manifests.map((m) => m.client_id).filter(Boolean))];
      const { data: clients } = await supabase
        .from("clients")
        .select("id, company_name, city, state")
        .in("id", clientIds);

      const clientMap = new Map((clients || []).map((c) => [c.id, c]));

      return manifests.map((m) => {
        const client = clientMap.get(m.client_id);
        const issues = detectIssues(m, client);
        return {
          id: m.id,
          manifest_number: m.manifest_number,
          status: m.status,
          created_at: m.created_at,
          signed_at: m.signed_at,
          client_name: client?.company_name ?? "Unknown Client",
          client_city: client?.city ?? null,
          client_state: client?.state ?? null,
          has_generator_sig: !!m.customer_signature_png_path,
          has_hauler_sig: !!m.driver_signature_png_path,
          has_receiver_sig: !!m.receiver_sig_path,
          signed_by_name: m.signed_by_name,
          signed_by_title: m.signed_by_title,
          generator_signed_at: m.generator_signed_at,
          hauler_signed_at: m.hauler_signed_at,
          receiver_signed_at: m.receiver_signed_at,
          issues,
          health_score: computeHealthScore(issues),
        };
      });
    },
    enabled: !!user?.currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
