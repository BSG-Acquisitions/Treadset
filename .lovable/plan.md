

## Enable Delete for All Pickup Statuses with Safety Measures

### Problem
Currently, "Delete Pickup" only appears for `scheduled` pickups. After testing (completing a manifest), there's no way to clean up from the UI. But opening this up for completed pickups risks accidental deletion of real production data.

### Solution
Remove the `scheduled`-only guard but add two layers of protection:

1. **Confirmation text input** — For completed pickups (ones with manifests), require the user to type the client company name to confirm deletion. This prevents accidental clicks.
2. **Void associated manifest** — Before deleting, void any linked manifest so no orphan data remains.

### Changes

**`src/pages/EnhancedRoutesToday.tsx`**
- Remove the `pickup.status === 'scheduled'` condition (line 511) so the delete option shows for all statuses
- For completed pickups: replace the simple AlertDialog with an enhanced confirmation that requires typing the company name (e.g., "Type **Test Company** to confirm")
- For scheduled pickups: keep the existing simple confirmation (no typing required since there's no manifest data at risk)
- Before calling `deletePickup.mutate()`, if the pickup has associated manifests, void them first using the existing `useVoidManifest` hook

**`src/hooks/usePickups.ts`** — No changes needed. The existing `delete_pickup_cascade` DB function already unlinks manifests and deletes assignments.

### UI Flow for Completed Pickups
1. User clicks three-dot menu → "Delete Pickup"
2. Dialog shows warning: "This pickup has a completed manifest. This action cannot be undone."
3. Text input: "Type **[Company Name]** to confirm"
4. Delete button stays disabled until text matches
5. On confirm: void manifest → delete pickup cascade

### UI Flow for Scheduled Pickups (unchanged)
1. Click "Delete Pickup" → simple "Are you sure?" dialog → Delete

