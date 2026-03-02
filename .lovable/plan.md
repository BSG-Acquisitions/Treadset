

## Why the AI Assistant Returns Zero

The `pte_processed` handler in the AI assistant edge function (lines 167-196) has four critical bugs:

1. **No support for specific months/years** — It only understands `today`, `this_week`, `this_month`. When you ask "How many tires in December 2025?", the AI maps it to `pte_processed` with a period it can't handle, so the date filter defaults to "now" and finds nothing.

2. **Incomplete PTE calculation** — It only sums `pte_on_rim + pte_off_rim`, ignoring commercial tires (×5), OTR (×15), and tractor (×5). This alone would undercount by ~50%.

3. **Uses `created_at` instead of `signed_at`** — Per business rules, manifests should be counted by completion time.

4. **Ignores drop-offs entirely** — The query only hits `manifests`, missing the 20,855 PTEs from drop-offs in December 2025.

5. **Missing status** — Only checks `COMPLETED`, misses `AWAITING_RECEIVER_SIGNATURE`.

## Plan

### Rewrite the `pte_processed` case in `supabase/functions/ai-assistant/index.ts`

**Step 1: Expand the AI's period vocabulary**

Update the system prompt (line 79) to include specific month/year periods:
- Add format: `month_year` (e.g., `december_2025`, `january_2026`)
- Add `last_month`, `last_year`, `ytd` periods
- Add new parameters: `month` (1-12) and `year` (2024, 2025, 2026)

**Step 2: Rewrite the `pte_processed` database query (lines 167-196)**

- Parse specific month+year parameters into proper date ranges
- Use the comprehensive PTE formula matching `_compute_manifest_ptes`: `pte_on_rim + pte_off_rim + 5*(commercial_17_5_19_5_off + commercial_17_5_19_5_on + commercial_22_5_off + commercial_22_5_on + tractor_count) + 15*otr_count`
- Use `COALESCE(signed_at, created_at)` for date filtering
- Include both `COMPLETED` and `AWAITING_RECEIVER_SIGNATURE` statuses
- Also query the `dropoffs` table and combine totals
- Return breakdown: manifest PTEs, drop-off PTEs, total PTEs, estimated tons (÷89)

**Step 3: Update the tool schema (lines 96-127)**

Add `month` and `year` as optional parameters so the AI can pass specific time ranges like December 2025.

### Summary of changes

One file: `supabase/functions/ai-assistant/index.ts`
- ~15 lines changed in system prompt
- ~5 lines added to tool schema
- ~50 lines rewritten in the `pte_processed` case

After this fix, asking "How many tires did we bring in for December 2025?" will return: **47,054 PTEs (529 tons) — 26,199 from manifests, 20,855 from drop-offs across 146 completed manifests.**

