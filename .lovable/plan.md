

# Show Payment Info on Completed Pickup Tiles + Check Number Input

## The Problem

When Brenner completes a pickup, the route planning page shows the PTE count and revenue amount, but NOT the payment method (cash, check, invoice, card) or check number. Justin has to text Brenner to find out how each customer paid and what check number was used. This creates unnecessary back-and-forth.

## The Solution

Two changes:

### 1. Add a `check_number` column to `pickups` and `manifests` tables

Neither table currently has this field. We need it so Brenner can record check numbers during manifest completion.

- Add `check_number` (text, nullable) to both `pickups` and `manifests` tables

### 2. Show a check number input when driver selects "Check" payment method

In the `DriverManifestCreationWizard.tsx`, when the driver selects "CHECK" on the payment-method step, a text input appears asking for the check number. This value gets saved to both the manifest and pickup records on submission.

### 3. Display payment method + check number on completed pickup tiles

On the route planning page (`EnhancedRoutesToday.tsx`), for completed pickups, add a line below the revenue showing:

- **Cash** -- green badge: "Cash"
- **Check** -- green badge: "Check #1234"
- **Invoice** -- amber badge: "To Be Invoiced"
- **Card on File** -- yellow badge: "Card on File - Pending"
- **Card (Stripe)** -- blue badge: "Card"

This info comes from the pickup's `payment_method` and `check_number` fields, which are already being saved during manifest completion.

## Files to Change

| Action | File | What |
|--------|------|------|
| DB Migration | `pickups` table | Add `check_number` text column |
| DB Migration | `manifests` table | Add `check_number` text column |
| Modify | `src/components/driver/DriverManifestCreationWizard.tsx` | Add check number input when CHECK is selected; save it to manifest and pickup on submit |
| Modify | `src/pages/EnhancedRoutesToday.tsx` | Show payment method badge + check number on completed pickup tiles |
| Modify | `src/hooks/usePickups.ts` | Add `payment_method`, `check_number` to the pickup query select (they're covered by `*` but manifest query needs `payment_method`, `check_number` added) |

## What It Looks Like

On a completed pickup tile, below the revenue line:

```text
Safeway Auto Center
123 Main St, Lansing
Truck #12
Total: 75 PTE
$206.25
[Check #4521]       <-- NEW: green badge with check number
[completed] [Done]
```

Or for an invoiced customer:

```text
Metro Tires
456 Oak Ave
Total: 42 PTE
$156.00
[To Be Invoiced]    <-- NEW: amber badge
[completed] [Done]
```

## What Brenner's Flow Looks Like

1. Brenner completes a pickup, reaches the "Payment Method" step
2. Selects "Check"
3. A text field appears: "Check Number" -- he types "4521"
4. Continues through signatures and submits
5. The route planning page immediately shows "Check #4521" on that tile
6. Justin sees it without texting anyone

