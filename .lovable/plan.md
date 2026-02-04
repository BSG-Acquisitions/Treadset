

# Fix: "Something Went Wrong" Error on Schedule Delivery

## Root Cause Identified

When you click "Schedule Delivery" on the Outbound page, the app crashes with "Something Went Wrong" because of an **invalid empty string value** in a Select component.

### The Error

Radix UI's Select component explicitly throws an error when a `<SelectItem>` has `value=""`:

> **Error: A `<Select.Item />` must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.**

### Where It Happens

**File: `src/components/outbound/ScheduleOutboundDialog.tsx`** (Line 198)

```tsx
<SelectItem value="">No specific vehicle</SelectItem>  // ← CRASHES HERE
```

The same issue exists in another file that could cause crashes elsewhere:

**File: `src/components/SimplifiedVehicleManagement.tsx`** (Line 186)

```tsx
<SelectItem value="">No Driver (Unassigned)</SelectItem>  // ← Also invalid
```

---

## The Fix

Replace empty strings with a meaningful placeholder value like `"none"` and update the logic to handle it:

### File 1: `src/components/outbound/ScheduleOutboundDialog.tsx`

**Line 198** - Change:
```tsx
<SelectItem value="">No specific vehicle</SelectItem>
```

To:
```tsx
<SelectItem value="none">No specific vehicle</SelectItem>
```

**Line 88** - Update the submit handler to convert `"none"` back to undefined:
```tsx
vehicle_id: vehicleId && vehicleId !== 'none' ? vehicleId : undefined,
```

### File 2: `src/components/SimplifiedVehicleManagement.tsx`

**Line 186** - Change:
```tsx
<SelectItem value="">No Driver (Unassigned)</SelectItem>
```

To:
```tsx
<SelectItem value="none">No Driver (Unassigned)</SelectItem>
```

Then update the corresponding handler to treat `"none"` as null/undefined.

---

## Files to Modify

| File | Line | Change |
|------|------|--------|
| `src/components/outbound/ScheduleOutboundDialog.tsx` | 198 | `value=""` → `value="none"` |
| `src/components/outbound/ScheduleOutboundDialog.tsx` | 88 | Handle `"none"` as undefined |
| `src/components/SimplifiedVehicleManagement.tsx` | 186 | `value=""` → `value="none"` |

---

## Why This Wasn't Caught Before

This error only occurs when the dialog opens and React tries to render the Select component. The crash happens immediately in the render cycle, which is why the ErrorBoundary catches it and shows "Something Went Wrong."

---

## Expected Result

After this fix:
- The Schedule Delivery dialog will open without crashing
- Selecting "No specific vehicle" will correctly set the vehicle_id to undefined/null
- No more "Something Went Wrong" errors on this page

