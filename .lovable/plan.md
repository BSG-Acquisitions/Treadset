

# Plan: Auto-Suggest Next Event + Manifest Integration Explanation

## How Trailer Route Manifests Already Integrate with Your Numbers

The manifests Jody fills out during trailer routes are **the same manifests** that feed all your other numbers. Here's the data flow:

```text
Driver completes pickup_full at client stop
  → DriverManifestCreationWizard opens
  → Driver enters all tire counts (PTE, commercial, OTR, tractor)
  → Manifest record created in `manifests` table
  → Same table queried by:
      ├─ Dashboard daily PTE goal
      ├─ Weekly activity chart
      ├─ Capacity forecast edge function
      ├─ Michigan state reports
      ├─ Client analytics (get_live_client_analytics)
      ├─ YTD PTE totals (get_ytd_pte_totals)
      └─ Raw material projections

Driver completes drop_full at processor (NTech)
  → Manifest created with direction='outbound' + 3 signatures
  → Tracked separately as outbound (shipments table)
  → Does NOT double-count in inbound PTE totals
```

The manifests from trailer routes use the **exact same `DriverManifestCreationWizard`** and write to the **exact same `manifests` table** with all the granular tire counts (pte_on_rim, pte_off_rim, commercial sizes, OTR, tractor). The `_compute_manifest_ptes` function and `get_ytd_pte_totals` function already pick these up. **No integration gap exists** — it's already unified.

The only scenario where numbers could diverge is if Jody chooses "Complete without Manifest" for a pickup_full event. In that case, the trailer event is logged but no manifest (and therefore no tire counts) enters the system. That's by design — if he skips the manifest, there's no tire data to count.

---

## Feature: Auto-Suggest Next Event Type

When a driver completes an event in the `DriverStopEventActions` (unplanned events), automatically pre-select the most logical next event type based on what just happened.

### Logic Map

| Just Completed | Auto-Suggest Next | Reasoning |
|---|---|---|
| `pickup_empty` | `drop_empty` | Picked up empty, next logical step is dropping it at a client |
| `drop_empty` | `pickup_full` | Dropped empty at client, pick up their full one |
| `pickup_full` | `drop_full` | Got the full trailer, take it to processor |
| `drop_full` | `pickup_empty` | Dropped full at processor, grab an empty to continue |
| `stage_empty` | — | No clear next step |
| `swap` | — | Swap is already a combined action |

### Implementation

**File: `src/components/trailers/DriverStopEventActions.tsx`**

1. Add a `lastCompletedEventType` state variable
2. After `handleCompleteEvent` succeeds (lines 200-210), set `lastCompletedEventType` to the event that was just completed
3. Create a `NEXT_EVENT_SUGGESTION` map:
   ```ts
   const NEXT_EVENT_SUGGESTION: Partial<Record<TrailerEventType, TrailerEventType>> = {
     pickup_empty: 'drop_empty',
     drop_empty: 'pickup_full',
     pickup_full: 'drop_full',
     drop_full: 'pickup_empty',
   };
   ```
4. After the dialog closes on success, if a suggestion exists, auto-open the dialog with the suggested event type pre-selected and show a subtle badge like "Suggested next" on it
5. The driver can dismiss or change the selection — it's a suggestion, not forced

**File: `src/components/trailers/GuidedStopEvents.tsx`**

The guided flow already auto-advances through planned events (the dispatcher pre-planned the sequence). No changes needed here — auto-suggest is specifically for the **unplanned `DriverStopEventActions`** component where the driver is choosing what to do ad-hoc.

### Files to Edit

| File | Change |
|------|--------|
| `src/components/trailers/DriverStopEventActions.tsx` | Add suggestion map, track last completed event, auto-pre-select next event type after completion |

