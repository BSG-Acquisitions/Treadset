

# Add Payment Method Badges and Per-Stop Revenue to Driver's "My Routes" View

This change mirrors the payment/revenue info already visible on the admin Routes page so Brenner (and any driver) can self-serve bookkeeping without contacting the office.

---

## What's Changing

On each stop card in the driver's Day view (`DriverRoutes.tsx`), completed stops will show:

1. **Payment method badge** -- identical styling to the admin view (Cash, Check #1234, To Be Invoiced, Card on File, Card)
2. **Per-stop revenue amount** -- displayed prominently (e.g., "$125.00") on completed stops

No data fetching changes are needed -- the driver assignments hook already fetches `pickup:pickups(*)` which includes `payment_method`, `check_number`, and `computed_revenue`.

---

## Technical Details

**File: `src/pages/DriverRoutes.tsx`**

Inside the day-view stop card (around line 432, after the client stats grid and before the notes section):

- For completed stops, add a new section containing:
  - A revenue line showing `$XX.XX` from `assignment.pickup?.computed_revenue`
  - A payment method badge matching the exact styling from `EnhancedRoutesToday.tsx` (lines 446-471):
    - CASH: green badge "Cash"
    - CHECK: green badge "Check #1234" (with check number if available)
    - INVOICE: amber badge "To Be Invoiced"  
    - CARD_ON_FILE: yellow badge "Card on File - Pending"
    - CARD: blue badge "Card"

- The summary card at the bottom already shows total revenue -- no changes needed there.

**No other files need modification.** The data is already fetched; this is purely a UI addition.

