
# Fix: Client Followups Not Suppressing Correctly After Scheduling/Completion

## What the Data Shows

After examining the live database and all the relevant code, there are **4 distinct bugs** causing followups to display incorrectly.

---

## Bug 1 — The 7-Day Scheduling Lookahead Is Too Narrow

**Current behavior:** The code only fetches scheduled pickups within the next 7 days to decide whether to hide a followup:

```text
.lte('pickup_date', sevenDaysFromNow)  // only looks 7 days ahead
```

**The problem — confirmed by Twin's Tire Service:**
Twin's has a scheduled pickup for TODAY (Feb 19). The system correctly has it in `upcoming_scheduled: 1`. But the filter window happens to catch it since it falls within 7 days. However, for any client with a pickup scheduled 8+ days out (which is common for monthly clients), the followup will still appear even though the client is already on the calendar.

**The fix:** Expand the scheduling lookahead to **60 days** — if a client is on the schedule at any point in the next 2 months, they should not appear as a followup target.

---

## Bug 2 — The `useActiveFollowups` Hook Uses the Wrong Column Name for the Interval

**Current code (line 104 of `useClientWorkflows.ts`):**
```text
const intervalDays = pattern?.average_days_between_pickups || 30;
```

**The problem:** `client_pickup_patterns` has a column called `average_days_between_pickups`, but the 75% threshold logic that decides whether to show a followup also reads from `workflow.contact_interval_days` — yet the `intervalDays` variable used for the threshold comes from the **pattern** table, not the workflow. When the pattern has no `average_days_between_pickups` (which is the case for many clients — `avg_interval_days: <nil>` in the data), it falls back to 30.

This means clients like Universal Tire (7-day interval) or Avis (14-day interval) fall through to the default 30-day threshold, so their followup threshold is calculated wrong and they may appear or disappear at the wrong time.

**The fix:** Use `workflow.contact_interval_days` as the primary source of interval truth (since the trigger already keeps it accurate per pickup), and only fall back to the pattern if the workflow interval is null. This ensures the correct client-specific cadence is used for the 75% threshold.

---

## Bug 3 — The Trigger Uses Wrong Column Name (Silent Failure for Some Clients)

**The DB function `update_workflow_on_pickup_completion` contains:**
```sql
SET 
  last_contact_date = NEW.pickup_date,
  next_contact_date = NEW.pickup_date + (v_interval_days || ' days')::interval,
  contact_interval_days = v_interval_days,   ← correct column
```

This is actually using the right column (`contact_interval_days`) in the current version. The trigger IS working — confirmed by seeing today's and yesterday's workflows updating correctly. However, the trigger **only fires when `status = 'completed'`**, not when a pickup is scheduled. So the workflow `next_contact_date` only advances when the pickup is actually completed, not when it's scheduled.

**The consequence:** A client can show up in followups even while they have a pickup in "scheduled" status — the scheduling lookahead filter (Bug 1) is the only thing preventing it, and when it's too narrow, they slip through.

---

## Bug 4 — `contact_frequency_days` vs `contact_interval_days` Column Mismatch in `useDriverWorkflow.ts`

In `src/hooks/useDriverWorkflow.ts` (the pickup completion flow), the upsert that creates/updates the followup workflow uses `contact_frequency_days`:

```ts
contact_frequency_days: 30,
```

But the actual column in the database is `contact_interval_days`. This means every auto-created followup after pickup completion is missing its interval value — it stays null — causing the 75% threshold logic to always fall back to 30 days regardless of the client's real cadence.

---

## The Fixes

### Fix 1 — Expand scheduling lookahead to 60 days (`useClientWorkflows.ts`)

```text
BEFORE: sevenDaysFromNow = today + 7 days
AFTER:  sixtyDaysFromNow = today + 60 days
```

Any client with a pickup scheduled in the next 60 days will be suppressed from the followup list.

### Fix 2 — Use `workflow.contact_interval_days` as primary interval source (`useClientWorkflows.ts`)

```text
BEFORE: const intervalDays = pattern?.average_days_between_pickups || 30;
AFTER:  const intervalDays = w.contact_interval_days || pattern?.average_days_between_pickups || 30;
```

This uses the workflow's own stored interval first (which the DB trigger keeps accurate), then the pattern, then the default.

### Fix 3 — Fix `contact_frequency_days` → `contact_interval_days` typo in `useDriverWorkflow.ts`

The upsert that auto-creates a followup after pickup completion currently writes to a column that doesn't exist:
```ts
BEFORE: contact_frequency_days: 30,
AFTER:  contact_interval_days: 30,
```

### Fix 4 — Improve the 75% threshold to also consider workflow `contact_interval_days`

The threshold filter in `useActiveFollowups` currently filters **out** clients who were picked up too recently. But it needs to use the corrected interval (from Fix 2) so that weekly clients are suppressed for 5+ days, biweekly clients for 10+ days, monthly clients for 22+ days — not all 22+ days using a hardcoded 30-day fallback.

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useClientWorkflows.ts` | (1) Expand scheduling lookahead from 7 to 60 days. (2) Use `workflow.contact_interval_days` as primary interval, pattern as fallback. |
| `src/hooks/useDriverWorkflow.ts` | Fix `contact_frequency_days` typo to `contact_interval_days` in the upsert. |

---

## What Dispatchers Will See After the Fix

- **Twin's Tire** (weekly, pickup scheduled today) — correctly hidden from followups ✓
- **Any monthly client with a pickup in the next 30-60 days** — correctly hidden ✓
- **Clients whose interval tracking was wrong** (like Universal Tire, Avis) — now uses the correct 7-day or 14-day threshold instead of the 30-day default ✓
- **Auto-created followup workflows after pickup completion** — now correctly set `contact_interval_days` so future threshold calculations work correctly ✓
