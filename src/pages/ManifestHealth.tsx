import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManifestHealthScan, ManifestHealthRecord } from "@/hooks/useManifestHealthScan";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function IssueBadge({ code, label, severity }: { code: string; label: string; severity: "error" | "warning" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        severity === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/10 text-warning-foreground"
      }`}
    >
      {severity === "error" ? <XCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function HealthScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-primary" : score >= 60 ? "text-muted-foreground" : "text-destructive";
  return <span className={`font-bold text-sm ${color}`}>{score}%</span>;
}

function ManifestRow({ record, onVoid }: { record: ManifestHealthRecord; onVoid: (id: string) => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{record.manifest_number}</span>
            <Badge variant="outline" className="text-xs">
              {record.status === "COMPLETED" ? "Completed" : "Awaiting Receiver"}
            </Badge>
            <HealthScoreBadge score={record.health_score} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {record.client_name}
            {record.client_city && ` · ${record.client_city}, ${record.client_state ?? ""}`}
            {" · "}
            {record.created_at ? format(new Date(record.created_at), "MMM d, yyyy") : "—"}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => navigate(`/manifests/${record.id}`)}
          >
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={() => onVoid(record.id)}
          >
            Void
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {record.issues.map((issue) => (
          <IssueBadge key={issue.code} {...issue} />
        ))}
      </div>
    </div>
  );
}

export default function ManifestHealth() {
  const { data: records = [], isLoading, refetch } = useManifestHealthScan();
  const { toast } = useToast();
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const withIssues = records.filter((r) => r.issues.length > 0);
  const allClear = records.filter((r) => r.issues.length === 0);
  const errorCount = withIssues.filter((r) => r.issues.some((i) => i.severity === "error")).length;
  const warnCount = withIssues.filter((r) => r.issues.every((i) => i.severity === "warning")).length;

  const missingSignatures = withIssues.filter(
    (r) => !r.has_generator_sig || !r.has_hauler_sig
  );
  const missingNames = withIssues.filter(
    (r) =>
      (!r.signed_by_name || r.signed_by_name.trim() === "") &&
      r.has_generator_sig &&
      r.has_hauler_sig
  );
  const addressIssues = withIssues.filter(
    (r) => !r.client_city && r.has_generator_sig && r.has_hauler_sig && r.signed_by_name
  );
  const other = withIssues.filter(
    (r) =>
      !missingSignatures.includes(r) &&
      !missingNames.includes(r) &&
      !addressIssues.includes(r)
  );

  const handleVoid = async (id: string) => {
    if (!window.confirm("Void this manifest? This cannot be undone.")) return;
    setVoidingId(id);
    try {
      const { error } = await supabase
        .from("manifests")
        .update({ status: "VOIDED" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Manifest voided", description: "The manifest has been voided." });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setVoidingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Manifest Health Scan</h1>
            <p className="text-sm text-muted-foreground">
              Automatically detects manifests with missing signatures, names, timestamps, or address issues.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Critical Errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary/70">{warnCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Warnings Only</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{withIssues.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total with Issues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{allClear.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">All Clear</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="signatures">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="signatures">
            Missing Sigs ({missingSignatures.length})
          </TabsTrigger>
          <TabsTrigger value="names">
            Missing Names ({missingNames.length})
          </TabsTrigger>
          <TabsTrigger value="address">
            Address Issues ({addressIssues.length})
          </TabsTrigger>
          <TabsTrigger value="other">
            Other ({other.length})
          </TabsTrigger>
          <TabsTrigger value="clear">
            ✓ All Clear ({allClear.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: "signatures", list: missingSignatures, emptyLabel: "No manifests missing signatures." },
          { key: "names", list: missingNames, emptyLabel: "No manifests missing printed names." },
          { key: "address", list: addressIssues, emptyLabel: "No address issues found." },
          { key: "other", list: other, emptyLabel: "No other issues found." },
        ].map(({ key, list, emptyLabel }) => (
          <TabsContent key={key} value={key}>
            <Card>
              {isLoading ? (
                <CardContent className="p-8 text-center text-muted-foreground">
                  Scanning manifests…
                </CardContent>
              ) : list.length === 0 ? (
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">{emptyLabel}</p>
                </CardContent>
              ) : (
                <div>
                  {list.map((r) => (
                    <ManifestRow key={r.id} record={r} onVoid={handleVoid} />
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="clear">
          <Card>
            {isLoading ? (
              <CardContent className="p-8 text-center text-muted-foreground">Scanning…</CardContent>
            ) : allClear.length === 0 ? (
              <CardContent className="p-8 text-center text-muted-foreground">
                No fully compliant manifests found.
              </CardContent>
            ) : (
              <div>
                {allClear.slice(0, 100).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30">
                    <div>
                      <span className="font-semibold text-sm">{r.manifest_number}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {r.created_at ? format(new Date(r.created_at), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {allClear.length > 100 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Showing 100 of {allClear.length} compliant manifests.
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
