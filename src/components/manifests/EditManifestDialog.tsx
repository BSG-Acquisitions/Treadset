import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateManifest } from "@/hooks/useManifests";
import {
  computeTotalPTE,
  recalcWeightTons,
  type ManifestTireCounts,
} from "@/lib/manifest-recalc";

// We accept any object that looks like a manifest row — the consumer
// (ManifestViewer) passes its useManifest result directly. We only read
// the fields we edit; everything else flows through unchanged.
interface ManifestLike extends ManifestTireCounts {
  id: string;
  manifest_number?: string | null;
  pickup_id?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  weight_tons?: number | string | null;
  total_pte?: number | null;
  notes?: string | null;
  signed_by_name?: string | null;
  signed_by_title?: string | null;
  signed_by_email?: string | null;
  driver_name?: string | null;
  edit_history?: Array<Record<string, unknown>> | null;
  client?: { email?: string | null } | null;
}

interface EditManifestDialogProps {
  manifest: ManifestLike;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COUNT_FIELDS: Array<{ key: keyof ManifestTireCounts; label: string }> = [
  { key: "pte_off_rim", label: "PTE Off-Rim" },
  { key: "pte_on_rim", label: "PTE On-Rim" },
  { key: "commercial_17_5_19_5_off", label: "Commercial 17.5/19.5 Off" },
  { key: "commercial_17_5_19_5_on", label: "Commercial 17.5/19.5 On" },
  { key: "commercial_22_5_off", label: "Commercial 22.5 Off" },
  { key: "commercial_22_5_on", label: "Commercial 22.5 On" },
  { key: "otr_count", label: "OTR" },
  { key: "tractor_count", label: "Tractor" },
  { key: "semi_count", label: "Semi" },
];

const toNum = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toMoneyString = (v: unknown) => {
  const n = toNum(v);
  return n.toFixed(2);
};

export function EditManifestDialog({
  manifest,
  open,
  onOpenChange,
}: EditManifestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateManifest = useUpdateManifest();

  // Mirror the manifest into editable state when the dialog opens. We
  // intentionally re-seed on every open so a user who closes without
  // saving gets a fresh form next time.
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [total, setTotal] = useState<string>("");
  const [subtotal, setSubtotal] = useState<string>("");
  const [signedByName, setSignedByName] = useState<string>("");
  const [signedByTitle, setSignedByTitle] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState<"idle" | "save" | "save-resend">("idle");

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, string> = {};
    for (const { key } of COUNT_FIELDS) {
      seed[key] = String(toNum(manifest[key]));
    }
    setCounts(seed);
    setTotal(toMoneyString(manifest.total));
    setSubtotal(toMoneyString(manifest.subtotal));
    setSignedByName(manifest.signed_by_name ?? "");
    setSignedByTitle(manifest.signed_by_title ?? "");
    setDriverName(manifest.driver_name ?? "");
    setNotes(manifest.notes ?? "");
    setReason("");
  }, [open, manifest]);

  // Live recalc preview. Editing the total stays manual (operator may want
  // to override pricing), but the PTE total and weight_tons follow the
  // tire counts — same Michigan rules as the driver wizard.
  const previewCounts: ManifestTireCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const { key } of COUNT_FIELDS) c[key] = toNum(counts[key]);
    return c as ManifestTireCounts;
  }, [counts]);

  const previewTotalPTE = useMemo(
    () => computeTotalPTE(previewCounts),
    [previewCounts],
  );
  const previewWeightTons = useMemo(
    () => recalcWeightTons(previewCounts),
    [previewCounts],
  );

  // What actually changed vs the original manifest. We use this to build
  // both the patch (only changed fields) and the edit_history audit entry
  // (only before/after for changed fields). Avoids polluting the audit log
  // with no-op edits.
  const changedKeys = useMemo(() => {
    const changed = new Set<string>();
    for (const { key } of COUNT_FIELDS) {
      if (toNum(counts[key]) !== toNum(manifest[key])) changed.add(String(key));
    }
    if (toNum(total) !== toNum(manifest.total)) changed.add("total");
    if (toNum(subtotal) !== toNum(manifest.subtotal)) changed.add("subtotal");
    if (signedByName !== (manifest.signed_by_name ?? ""))
      changed.add("signed_by_name");
    if (signedByTitle !== (manifest.signed_by_title ?? ""))
      changed.add("signed_by_title");
    if (driverName !== (manifest.driver_name ?? "")) changed.add("driver_name");
    if (notes !== (manifest.notes ?? "")) changed.add("notes");
    // Recalculated fields — flag them as changed if any tire-count changed,
    // so the patch persists the new values alongside the new counts.
    if (
      Math.abs(previewTotalPTE - toNum(manifest.total_pte)) > 0 ||
      Math.abs(previewWeightTons - toNum(manifest.weight_tons)) > 0.001
    ) {
      changed.add("total_pte");
      changed.add("weight_tons");
    }
    return changed;
  }, [
    counts,
    total,
    subtotal,
    signedByName,
    signedByTitle,
    driverName,
    notes,
    previewTotalPTE,
    previewWeightTons,
    manifest,
  ]);

  const hasChanges = changedKeys.size > 0;
  const reasonValid = reason.trim().length >= 4;

  const persist = async (
    intent: "save" | "save-resend",
  ): Promise<{ ok: boolean; recipient?: string }> => {
    if (!hasChanges) {
      toast({
        title: "No changes",
        description: "Edit at least one field before saving.",
      });
      return { ok: false };
    }
    if (!reasonValid) {
      toast({
        title: "Reason required",
        description:
          "Tell us why this manifest is being edited (audit log requirement).",
        variant: "destructive",
      });
      return { ok: false };
    }

    setBusy(intent);

    const patch: Record<string, unknown> = { id: manifest.id };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    for (const { key } of COUNT_FIELDS) {
      if (changedKeys.has(String(key))) {
        const v = toNum(counts[key]);
        patch[key] = v;
        before[key] = toNum(manifest[key]);
        after[key] = v;
      }
    }
    if (changedKeys.has("total")) {
      patch.total = toNum(total);
      before.total = toNum(manifest.total);
      after.total = toNum(total);
    }
    if (changedKeys.has("subtotal")) {
      patch.subtotal = toNum(subtotal);
      before.subtotal = toNum(manifest.subtotal);
      after.subtotal = toNum(subtotal);
    }
    if (changedKeys.has("total_pte")) {
      patch.total_pte = previewTotalPTE;
      before.total_pte = toNum(manifest.total_pte);
      after.total_pte = previewTotalPTE;
    }
    if (changedKeys.has("weight_tons")) {
      patch.weight_tons = Number(previewWeightTons.toFixed(2));
      before.weight_tons = toNum(manifest.weight_tons);
      after.weight_tons = Number(previewWeightTons.toFixed(2));
    }
    if (changedKeys.has("signed_by_name")) {
      patch.signed_by_name = signedByName;
      before.signed_by_name = manifest.signed_by_name ?? "";
      after.signed_by_name = signedByName;
    }
    if (changedKeys.has("signed_by_title")) {
      patch.signed_by_title = signedByTitle;
      before.signed_by_title = manifest.signed_by_title ?? "";
      after.signed_by_title = signedByTitle;
    }
    if (changedKeys.has("driver_name")) {
      patch.driver_name = driverName;
      before.driver_name = manifest.driver_name ?? "";
      after.driver_name = driverName;
    }
    if (changedKeys.has("notes")) {
      patch.notes = notes;
      before.notes = manifest.notes ?? "";
      after.notes = notes;
    }

    const newHistoryEntry = {
      at: new Date().toISOString(),
      by_user_id: user?.id ?? null,
      by_email: user?.email ?? null,
      reason: reason.trim(),
      changed: Array.from(changedKeys),
      before,
      after,
    };
    patch.edit_history = [
      ...((manifest.edit_history ?? []) as Array<Record<string, unknown>>),
      newHistoryEntry,
    ];

    try {
      await updateManifest.mutateAsync(patch as Parameters<typeof updateManifest.mutateAsync>[0]);
    } catch (err) {
      console.error("[EditManifest] update failed", err);
      toast({
        title: "Save failed",
        description: (err as Error)?.message ?? "Could not save manifest changes.",
        variant: "destructive",
      });
      setBusy("idle");
      return { ok: false };
    }

    // Tire-count changes invalidate the PDF — fields the customer sees on
    // the attachment will be wrong until we regenerate. Trigger a fresh
    // build that pulls from the now-updated row.
    const tireCountChanged = COUNT_FIELDS.some(({ key }) =>
      changedKeys.has(String(key)),
    );
    if (tireCountChanged && manifest.pickup_id) {
      try {
        await supabase.functions.invoke("ensure-manifest-pdf", {
          body: { pickup_id: manifest.pickup_id, force_regenerate: true },
        });
      } catch (err) {
        console.warn("[EditManifest] PDF regen failed (non-fatal)", err);
        toast({
          title: "PDF regen warning",
          description:
            "The manifest was saved but the PDF could not be rebuilt automatically. Use the regenerate control on this page.",
        });
      }
    }

    if (intent === "save-resend") {
      const recipient = manifest.client?.email;
      if (!recipient) {
        toast({
          title: "Saved (no resend)",
          description:
            "No email on file for this client — changes saved but the corrected manifest could not be emailed.",
        });
        setBusy("idle");
        return { ok: true };
      }
      try {
        const subject = `Manifest ${manifest.manifest_number ?? ""} - Revised and Approved`.trim();
        const html = `
          <p>Hi,</p>
          <p>This message replaces the manifest copy you previously received. The latest version, with corrections, is attached.</p>
          <p><strong>Reason for revision:</strong> ${escapeHtml(reason.trim())}</p>
          <p>The corrected manifest supersedes the prior copy. No action is required on your end; this is for your records.</p>
          <p>Thank you,<br/>BSG Tires / TreadSet</p>
        `;
        await supabase.functions.invoke("send-manifest-email", {
          body: { manifest_id: manifest.id, subject, html },
        });
        toast({
          title: "Revised manifest sent",
          description: `Sent to ${recipient}.`,
        });
        setBusy("idle");
        return { ok: true, recipient };
      } catch (err) {
        console.error("[EditManifest] resend failed", err);
        toast({
          title: "Resend failed",
          description:
            "Changes were saved but the corrected email could not be sent. Try again from this dialog.",
          variant: "destructive",
        });
        setBusy("idle");
        return { ok: true };
      }
    }

    toast({
      title: "Manifest updated",
      description: "Changes saved with audit log entry.",
    });
    setBusy("idle");
    return { ok: true };
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (busy === "idle" ? onOpenChange(o) : null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit manifest {manifest.manifest_number ?? ""}
          </DialogTitle>
          <DialogDescription>
            Corrections are written to an audit log on this manifest. Only
            edit when you're certain — the customer's emailed copy will need
            to be resent if dollar amounts or tire counts change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Tire counts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COUNT_FIELDS.map(({ key, label }) => (
                <div key={String(key)} className="space-y-1">
                  <Label htmlFor={`count-${String(key)}`} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={`count-${String(key)}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={counts[key] ?? "0"}
                    onChange={(e) =>
                      setCounts((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2 grid grid-cols-2 gap-2">
              <div>
                Total PTE (recalculated):{" "}
                <strong className="text-foreground">{previewTotalPTE}</strong>
              </div>
              <div>
                Weight (recalculated):{" "}
                <strong className="text-foreground">
                  {previewWeightTons.toFixed(2)}
                </strong>{" "}
                tons
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-subtotal">Subtotal ($)</Label>
              <Input
                id="edit-subtotal"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-total">Total ($)</Label>
              <Input
                id="edit-total"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-signer-name">Signed by (name)</Label>
              <Input
                id="edit-signer-name"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-signer-title">Signed by (title)</Label>
              <Input
                id="edit-signer-title"
                value={signedByTitle}
                onChange={(e) => setSignedByTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="edit-driver">Driver name</Label>
              <Input
                id="edit-driver"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-1">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          <section className="space-y-1">
            <Label htmlFor="edit-reason">
              Reason for edit <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              rows={2}
              placeholder="e.g. Driver logged 168 tires under commercial 22.5 — actually PTE off-rim car tires."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!reasonValid && reason.length > 0}
            />
            <p className="text-xs text-muted-foreground">
              Stored in the manifest's audit log (compliance / Re-TRAC).
            </p>
          </section>

          {!hasChanges && (
            <Alert>
              <AlertDescription>No changes yet.</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy !== "idle"}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              const r = await persist("save");
              if (r.ok) onOpenChange(false);
            }}
            disabled={busy !== "idle" || !hasChanges || !reasonValid}
          >
            {busy === "save" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save
          </Button>
          <Button
            type="button"
            onClick={async () => {
              const r = await persist("save-resend");
              if (r.ok) onOpenChange(false);
            }}
            disabled={busy !== "idle" || !hasChanges || !reasonValid}
          >
            {busy === "save-resend" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save & resend to client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
