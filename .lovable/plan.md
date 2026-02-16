
# Add Inline Check Number Input on Driver's Completed Stop Cards

## Problem
1. When Brenner completes a stop and selects CHECK as the payment method, the check number input exists in the manifest wizard but may not be getting saved properly or may be getting skipped.
2. After a stop is already completed, there is **no way** to add or edit the check number from the driver's route view -- the green payment bar is completely read-only.

## Solution
Make the check number **editable inline** on the green payment bar for completed stops where the payment method is CHECK. This way Brenner can enter or update the check number directly on the route card after completion, and it syncs to the database so the office can see it too.

## What Will Change

**File: `src/pages/DriverRoutes.tsx`**

On the green payment bar for completed CHECK stops (lines 449-453), replace the static "Check #" badge with an interactive inline input:

- When payment method is CHECK, show a small text input field pre-filled with any existing check number
- The input will have a "save" button (or auto-save on blur) that updates the pickup's `check_number` field in the database
- After saving, the badge updates to show the saved check number (e.g., "Check #4521")
- A toast confirmation appears so Brenner knows it saved
- The save calls `supabase.from('pickups').update({ check_number }).eq('id', pickupId)` directly, plus invalidates the relevant query caches so the admin view sees the update immediately

**Visual behavior:**
- If no check number is set yet: Shows the input field with placeholder "Enter check #"
- If check number already exists: Shows the green badge "Check #4521" with a small edit/pencil icon that, when tapped, toggles back to the input for editing

**No new files or dependencies needed.** This uses the existing `Input` component and Supabase client. The `useDriverAssignments` hook already fetches `pickup:pickups(*)` which includes `check_number`.
