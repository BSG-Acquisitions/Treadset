

# Fix: Edit Product Form Not Populating Existing Data

## Problem

When clicking "Edit" on a product, the form opens **empty** instead of showing the product's existing information (name, description, category, etc.).

## Root Cause

In `ProductDialog.tsx`, lines 77-89 use `useState` incorrectly as an effect:

```typescript
// WRONG - useState callback only runs ONCE on initial mount
useState(() => {
  if (open) {
    form.reset({ ... });
  }
});
```

This should be `useEffect` with proper dependencies, so it runs **every time** the `product` or `open` props change.

## Fix

**File:** `src/components/inventory/ProductDialog.tsx`

| Lines | Change |
|-------|--------|
| 1 | Import `useEffect` instead of just `useState` |
| 77-89 | Replace `useState` with `useEffect` and proper dependency array |

### Updated Code

```typescript
// Line 1: Update import
import { useEffect } from 'react';

// Lines 77-89: Replace useState with useEffect
useEffect(() => {
  if (open) {
    form.reset({
      name: product?.name ?? '',
      description: product?.description ?? '',
      category: product?.category ?? 'other',
      unit_of_measure: product?.unit_of_measure ?? 'tons',
      sku: product?.sku ?? '',
      low_stock_threshold: product?.low_stock_threshold ?? undefined,
      is_active: product?.is_active ?? true,
    });
  }
}, [open, product, form]);
```

## Result

- When you click "Edit" on any product, the form will now correctly populate with:
  - Product name (e.g., "Brown Rubber Mulch")
  - Description (e.g., "Wire-free rubber mulch, brown")
  - Category, unit of measure, SKU, low stock threshold, and active status
- You can then clear or modify any field, including removing the description
- The form will still be empty when clicking "Add Product" (since `product` will be `null`)

