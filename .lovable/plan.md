

# Navigation & Reporting Cleanup Plan

## Issues Identified

### 1. TopNav Layout - Items Bunched Left

The navigation items are using `gap-0` and clustering together on the left side instead of spreading across the nav bar.

**Current CSS (line 182):**
```css
<nav className="flex items-center gap-0">
```

**Fix:** Add proper spacing with `justify-start` plus `gap-1` or use `justify-evenly` to spread items across the available width.

---

### 2. Michigan Reports Data Problem

The Michigan Reports page shows **wrong PTE numbers** because it's pulling from the `pickups` table which has incomplete data.

| Data Source | 2026 Records | PTE Data |
|-------------|--------------|----------|
| `pickups` table | 102 pickups | ~1,000 PTE (incomplete) |
| `manifests` table | 125 manifests | ~18,800 PTE (accurate) |

**Root Cause:** `useMichiganReporting.ts` (line 56-75) queries `pickups` table, but the real PTE data lives in `manifests`:
- `pte_off_rim`: 18,676
- `pte_on_rim`: 198
- `otr_count`: 17
- `tractor_count`: 40

**Fix:** Rewrite the hook to pull from `manifests` table where `direction = 'inbound'`, using the proper PTE columns (`pte_off_rim`, `pte_on_rim`, etc.).

---

### 3. Outbound Tab Shows Zero

The Outbound tab in Michigan Reports shows zero because:
1. The `shipments` table is empty (no records)
2. Outbound manifests exist but don't auto-create shipment records

**Database finding:** There are 0 outbound manifests in 2026 (all 125 are `direction = 'inbound'`). This is expected since the outbound assignment system was just built.

**Fix:** When outbound manifests are completed, they should auto-create a corresponding `shipments` record. The OutboundManifestWizard needs to insert into `shipments` table on completion.

---

### 4. Data Quality & Deployment Pages

Both pages are functional but currently unused/empty:

| Page | Purpose | Status |
|------|---------|--------|
| Data Quality | Automated scan for missing geocodes, signatures, counties | Works but empty - no flags in system |
| Deployment | Internal feature tracking sandbox→live | Empty - no modules tracked |

**Recommendation:** Hide both from navigation until they're actively used. They add clutter without value currently.

---

### 5. Trailers vs. Outbound Schedule

User asked if these should be combined. Current structure:

- **Trailers dropdown:** Asset management (inventory, vehicles, drivers)
- **Outbound Schedule:** Delivery assignments to receivers

**Recommendation:** Keep separate. Trailers = assets, Outbound = operations. Different concerns, different users (fleet manager vs dispatcher).

---

## Implementation Plan

### Phase 1: Fix Navigation Layout

**File: `src/components/TopNav.tsx`**

Change the nav container from bunched to properly spaced:

```tsx
// Line 182 - Change from:
<nav className="flex items-center gap-0">

// To:
<nav className="flex items-center gap-1 sm:gap-2">
```

This keeps items left-aligned (proper UX for navigation) but adds breathing room between dropdowns.

---

### Phase 2: Fix Michigan Reports Data Source

**File: `src/hooks/useMichiganReporting.ts`**

Replace the pickups-based query with a manifests-based query:

```tsx
// Replace lines 56-75 with:
const { data: manifests, error: manifestsError } = await supabase
  .from('manifests')
  .select(`
    *,
    clients!inner(
      id,
      company_name,
      county,
      city,
      state
    )
  `)
  .eq('direction', 'inbound')
  .gte('created_at', `${year}-01-01`)
  .lte('created_at', `${year}-12-31`);
```

Update the PTE calculation to use manifest fields:
- `pte_off_rim` + `pte_on_rim` = passenger tire PTEs
- `commercial_17_5_19_5_off` + `commercial_17_5_19_5_on` 
- `commercial_22_5_off` + `commercial_22_5_on`
- `otr_count` (× OTR multiplier)
- `tractor_count` (× tractor multiplier)

---

### Phase 3: Auto-Create Shipment on Outbound Manifest

**File: `src/components/driver/OutboundManifestWizard.tsx`**

After manifest creation succeeds, also insert a `shipments` record:

```tsx
// After manifest is created successfully:
await supabase.from('shipments').insert({
  organization_id: manifest.organization_id,
  manifest_id: manifest.id,
  direction: 'outbound',
  origin_entity_id: manifest.origin_entity_id,
  destination_entity_id: manifest.destination_entity_id,
  departed_at: new Date().toISOString(),
  material_form: manifest.material_form,
  quantity: manifest.quantity,
  quantity_pte: manifest.total_pte,
  unit_basis: 'pte'
});
```

This ensures the Michigan Reports Outbound tab has data to display.

---

### Phase 4: Hide Unused Admin Pages

**File: `src/components/TopNav.tsx`**

Remove Data Quality and Deployment from the "More" dropdown (lines 403-444):
- Remove the Data Quality menu item
- Remove the Deployment menu item (and its separator)

These can be re-added later when actively used.

**File: `src/components/AppSidebar.tsx`**

Also remove from sidebar to maintain consistency.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TopNav.tsx` | Fix nav spacing, remove unused items |
| `src/hooks/useMichiganReporting.ts` | Switch from pickups to manifests data source |
| `src/components/driver/OutboundManifestWizard.tsx` | Auto-create shipment record on completion |
| `src/components/AppSidebar.tsx` | Remove Data Quality and Deployment nav items |

---

## Result After Implementation

| Issue | Before | After |
|-------|--------|-------|
| Nav spacing | Items bunched left | Evenly spaced with gaps |
| Michigan inbound PTE | ~1,000 (wrong) | ~18,800 (correct from manifests) |
| Michigan outbound | Zero (no shipments) | Populates when outbound manifests complete |
| Unused pages | Visible, confusing | Hidden from nav |

---

## Technical Notes

### Michigan PTE Calculation Formula

The manifests table has detailed tire counts that need proper conversion:

```text
Total PTE = 
  pte_off_rim + pte_on_rim +           // Passenger tires (1:1)
  commercial_17_5_19_5_off + on +      // Small commercial (1:1 or 2:1)
  commercial_22_5_off + on +           // Large commercial (5:1 typical)
  (otr_count × 15) +                   // OTR multiplier
  (tractor_count × 5)                  // Tractor tire multiplier
```

The existing `michigan-conversions.ts` library has the correct ratios. The hook just needs to use manifest data instead of pickup data.

### Shipments Table Schema

```sql
shipments (
  organization_id uuid,
  manifest_id uuid,       -- Links to manifest
  direction text,         -- 'outbound'
  origin_entity_id uuid,  -- BSG location
  destination_entity_id uuid, -- NTech, etc.
  departed_at timestamp,
  material_form text,
  quantity numeric,
  quantity_pte integer,
  unit_basis text
)
```

