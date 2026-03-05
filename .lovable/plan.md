

# Tire Movement Tracking: Current State + Gaps

## What's Currently Tracking Inbound Tires

Your system has solid inbound tracking through two channels:

```text
INBOUND TIRE SOURCES
├─ Manifests (direction = 'inbound' or NULL)
│   ├─ Driver pickup manifests (DriverManifestCreationWizard)
│   ├─ Standalone manifests (trailer route pickups)
│   └─ All granular counts: PTE on/off rim, commercial sizes, OTR, tractor
│
├─ Drop-offs (hauler/walk-in deliveries)
│   └─ pte_count, otr_count, tractor_count
│
└─ Reporting consumers:
    ├─ get_ytd_pte_totals() — combines manifests + dropoffs, deduplicates
    ├─ _compute_manifest_ptes() — daily/weekly dashboard PTE
    ├─ Michigan State Reports (useMichiganReporting) — inbound manifests only
    ├─ Client analytics (get_live_client_analytics)
    └─ Raw material projections
```

## What's Currently Tracking Outbound Tires

```text
OUTBOUND TIRE SOURCES
├─ Outbound Manifests (direction = 'outbound')
│   └─ Created via OutboundManifestWizard (dedicated outbound hauler flow)
│   └─ Creates shipment records via useCreateShipmentFromManifest
│
├─ Shipments table (manual entry via Shipments page)
│   └─ ShipmentDialog — manual outbound shipment recording
│
└─ Reporting consumers:
    ├─ Shipments page — summary cards (total PTE out, tons out)
    ├─ useOutboundSummary — feeds State Compliance Reports OutboundTab
    └─ Michigan EGLE annual report
```

## GAP FOUND: Trailer Route Drops at Processors Are NOT Tracked as Outbound

When Jody does a `drop_full` at a processor (NTech) via the trailer route flow:
- A manifest IS created via `DriverManifestCreationWizard` in `drop_to_processor` mode
- But `direction` is **never set** — it defaults to NULL/inbound
- **No shipment record** is created in the `shipments` table
- These tires are being **counted as inbound** in your PTE totals and state reports

This means trailer drops at processors are invisible on the outbound side and are inflating your inbound numbers.

## Fix Plan

### 1. Set `direction = 'outbound'` on processor drop manifests

**File: `src/components/driver/DriverManifestCreationWizard.tsx`**

In the `manifestData` object (~line 1013), add:
```ts
direction: isDropToProcessor ? 'outbound' : 'inbound',
```

This ensures processor drop manifests are correctly categorized and excluded from inbound PTE totals (since `_compute_manifest_ptes` and `get_ytd_pte_totals` already filter by direction or exclude outbound).

### 2. Auto-create shipment record when processor drop manifest completes

**File: `src/components/driver/DriverManifestCreationWizard.tsx`**

After the manifest is created and PDF generated in `drop_to_processor` mode, call `useCreateShipmentFromManifest` to create a matching shipment record — same pattern already used in `OutboundManifestWizard` and `OutboundReceiverDialog`. This makes the drop appear on the Shipments page and in outbound compliance reporting.

### 3. Ensure `get_ytd_pte_totals` excludes outbound manifests

The current function already excludes manifests linked to dropoffs, but does NOT filter by `direction`. Adding `AND direction != 'outbound'` (or `AND (direction IS NULL OR direction = 'inbound')`) to the manifest query ensures processor drops don't inflate inbound PTE counts.

**Database function: `get_ytd_pte_totals`** — add direction filter to the manifest subqueries.

### 4. Ensure `_compute_manifest_ptes` excludes outbound manifests

Same fix: add `AND (m.direction IS NULL OR m.direction = 'inbound')` to prevent outbound processor drops from being counted as daily inbound PTE.

### Summary of Changes

| File/Function | Change |
|---|---|
| `DriverManifestCreationWizard.tsx` | Add `direction: isDropToProcessor ? 'outbound' : 'inbound'` to manifest data; call `useCreateShipmentFromManifest` after processor drop completion |
| `get_ytd_pte_totals` (DB function) | Add `AND (direction IS NULL OR direction = 'inbound')` to manifest queries |
| `_compute_manifest_ptes` (DB function) | Add same direction filter |

This closes the loop: every tire entering BSG is tracked inbound, every tire leaving to a processor is tracked outbound, and the numbers stay accurate across all dashboards and compliance reports.

