import { MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";

export interface ManifestTireCounts {
  pte_off_rim?: number | null;
  pte_on_rim?: number | null;
  commercial_17_5_19_5_off?: number | null;
  commercial_17_5_19_5_on?: number | null;
  commercial_22_5_off?: number | null;
  commercial_22_5_on?: number | null;
  otr_count?: number | null;
  tractor_count?: number | null;
  semi_count?: number | null;
}

const num = (v: number | null | undefined) => Number(v) || 0;

// Mirror of DriverManifestCreationWizard's computeTotalPTE — same Michigan
// rules so manifests created via the driver wizard and manifests edited via
// the admin EditManifestDialog produce identical PTE totals for identical
// tire counts. Source of truth lives here; the wizard keeps its inline copy
// for now (extracting the wizard is out of scope for this change).
export function computeTotalPTE(counts: ManifestTireCounts): number {
  const passenger =
    (num(counts.pte_off_rim) + num(counts.pte_on_rim)) *
    MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
  const truck =
    (num(counts.commercial_17_5_19_5_off) +
      num(counts.commercial_17_5_19_5_on) +
      num(counts.commercial_22_5_off) +
      num(counts.commercial_22_5_on)) *
    MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
  const semi = num(counts.semi_count) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
  const tractor = num(counts.tractor_count) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
  const otr = num(counts.otr_count) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
  return passenger + truck + semi + tractor + otr;
}

// Michigan precedence: 89 PTE = 1 ton.
export function pteToTons(pte: number): number {
  return pte / 89;
}

// Used for the EditManifestDialog preview pane and for persisting the
// recomputed weight_tons alongside any tire-count edit.
export function recalcWeightTons(counts: ManifestTireCounts): number {
  return pteToTons(computeTotalPTE(counts));
}
