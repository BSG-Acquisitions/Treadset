
# Fix: Manifest Payment Method Mismatch

## The Problem

The manifest record **always** saves `payment_method: 'CARD'` (or `'INVOICE'`) regardless of what the driver actually selects. The pickup record saves the correct value. This creates a data integrity issue across the entire history.

**Root cause:** Two lines in `DriverManifestCreationWizard.tsx` hardcode the manifest payment method instead of using the driver's actual selection:

- Line 892: `payment_method: requiresInvoice ? 'INVOICE' : 'CARD'` (manifest creation)
- Line 924: `payment_method: requiresInvoice ? 'INVOICE' : 'CARD'` (manifest update)

Meanwhile line 1044 correctly uses: `payment_method: paymentMethod` (pickup update)

## The Fix

### 1. Code Fix (DriverManifestCreationWizard.tsx)

Replace the hardcoded values on lines 892 and 924 with the actual `paymentMethod` state variable:

- Line 892: Change to `payment_method: paymentMethod`
- Line 924: Change to `payment_method: paymentMethod`

Both payment_status lines (893 and 925) should also use the actual method to determine status:
- `payment_status: (paymentMethod === 'CASH' || paymentMethod === 'CHECK') ? 'SUCCEEDED' : 'PENDING'`

### 2. Historical Data Repair (SQL Migration)

Run a one-time migration to sync all existing manifest records with their pickup's actual payment method:

```text
UPDATE manifests m
SET payment_method = p.payment_method,
    check_number = COALESCE(m.check_number, p.check_number)
FROM pickups p
WHERE m.pickup_id = p.id
  AND p.payment_method IS NOT NULL
  AND m.payment_method IS DISTINCT FROM p.payment_method;
```

This will fix all the historical mismatches (North End, Redford Auto, 75 Tires, Crown Tire, King Tire, One Stop, City Tire, Fischer Honda, etc.).

### 3. Verification

After both changes, query to confirm zero mismatches remain between pickup and manifest payment methods.

## Technical Details

**File:** `src/components/driver/DriverManifestCreationWizard.tsx`
- Line 892: `payment_method: requiresInvoice ? ('INVOICE' as const) : ('CARD' as const)` --> `payment_method: paymentMethod`
- Line 893: `payment_status: requiresInvoice ? ('PENDING' as const) : ('PENDING' as const)` --> `payment_status: (paymentMethod === 'CASH' || paymentMethod === 'CHECK') ? ('SUCCEEDED' as const) : ('PENDING' as const)`
- Line 924: `payment_method: requiresInvoice ? 'INVOICE' : 'CARD'` --> `payment_method: paymentMethod`
- Line 925: `payment_status: requiresInvoice ? 'PENDING' : 'PENDING'` --> `payment_status: (paymentMethod === 'CASH' || paymentMethod === 'CHECK') ? 'SUCCEEDED' : 'PENDING'`

**SQL Migration:** One UPDATE statement to backfill correct payment methods from pickups into their linked manifests.
