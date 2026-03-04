

## Plan: Make Contact Fields Optional in Add Stop Form

The contact name and contact phone fields in Step 2 of the TrailerRouteWizard are already optional in the database (no validation requiring them), but the labels don't indicate this. Simple label update.

### Change
**File**: `src/components/trailers/TrailerRouteWizard.tsx`
- Change `<Label>Contact Name</Label>` → `<Label>Contact Name (Optional)</Label>`
- Change `<Label>Contact Phone</Label>` → `<Label>Contact Phone (Optional)</Label>`

One file, two label changes.

