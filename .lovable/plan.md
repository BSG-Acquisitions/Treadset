
# Fix Raw Material Projections Update + Add Rubber Mulch Conversion

## Problem Identified

The Raw Materials tile still shows 930.44 tons because the React Query cache is not being invalidated when products and transactions are deleted. The hook has a 5-minute stale time, so it's showing old cached data even though the database is now empty.

## What Will Be Fixed

### 1. Cache Invalidation

When products or transactions are deleted/created/updated, the `raw-material-projections` query needs to be invalidated so it refetches fresh data.

| Hook | Change |
|------|--------|
| `useDeleteInventoryProduct` | Add invalidation of `raw-material-projections` |
| `useCreateInventoryProduct` | Add invalidation of `raw-material-projections` |
| `useCreateInventoryTransaction` | Add invalidation of `raw-material-projections` |
| `useDeleteInventoryTransaction` | Add invalidation of `raw-material-projections` |

### 2. Rubber Mulch Conversion

You provided valuable conversion data:
- **1,000 lbs = 1.2 cubic yards** for rubber mulch
- This means: **1 cubic yard ≈ 833.33 lbs ≈ 0.417 tons**

I'll update the conversion logic to use the correct rubber mulch conversion factor instead of the generic 0.25 tons/cubic yard.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useInventoryProducts.ts` | Add `raw-material-projections` invalidation on create/delete |
| `src/hooks/useInventoryTransactions.ts` | Add `raw-material-projections` invalidation on create/delete |
| `src/hooks/useRawMaterialProjections.ts` | Update cubic yard conversion to use 0.417 tons/CY for mulch |
| `src/lib/michigan-conversions.ts` | Add rubber mulch conversion constant |

## After This Fix

Once implemented:
- Deleting products/transactions will immediately update the Raw Materials tile
- The raw material weight will now correctly show only tire intake (with zero processed)
- Future cubic yard calculations for mulch will use the accurate 1,000 lbs = 1.2 CY conversion
- All projections will stay in sync with inventory changes
