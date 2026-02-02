
# Fix: "View & Schedule" Button Access Denied for Drivers

## Problem
When Brenner (driver role) clicks "View & Schedule" in the Route Optimization Suggestions dialog, he gets an "Access Denied" page because the button navigates to `/clients/{id}`, which requires admin, ops_manager, dispatcher, or sales roles.

**Console logs confirm this:**
```
Access denied - User roles: ["driver"] Required roles: ["admin", "ops_manager", "dispatcher", "sales"]
```

## Solution
Change the "View & Schedule" button to open the `DriverSchedulePickupDialog` with the client pre-selected, instead of navigating to the restricted client detail page.

---

## Technical Implementation

### File: `src/components/driver/RouteOptimizationSuggestions.tsx`

**Changes needed:**

1. **Import the DriverSchedulePickupDialog** (or create a quick-schedule version)
2. **Replace the navigation** with opening a scheduling dialog pre-populated with the suggested client
3. **Add state** to track which client should be pre-selected in the dialog

**Before (line 62-65):**
```typescript
const handleViewClient = (clientId: string) => {
  onOpenChange(false);
  navigate(`/clients/${clientId}`);
};
```

**After:**
```typescript
const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
const [selectedSuggestion, setSelectedSuggestion] = useState<RouteSuggestion | null>(null);

const handleScheduleClient = (suggestion: RouteSuggestion) => {
  setSelectedSuggestion(suggestion);
  setScheduleDialogOpen(true);
};
```

**Button change (line 103-111):**
```typescript
// Before:
<Button onClick={() => handleViewClient(suggestion.client_id)}>
  <ExternalLink className="h-3 w-3 mr-1" />
  View & Schedule
</Button>

// After:
<Button onClick={() => handleScheduleClient(suggestion)}>
  <Calendar className="h-3 w-3 mr-1" />
  Quick Schedule
</Button>
```

### New Sub-Component: Quick Schedule Dialog

Add a simplified inline scheduling flow within the suggestions dialog:
- Pre-fill client name and ID
- Show pickup date selector (default to the selected route day)
- Basic tire count inputs
- Submit schedules the pickup via `useDriverSchedulePickup` hook

---

## Alternative Approach (Simpler)

If adding inline scheduling is too complex, we can:
1. Navigate to `/book` (the DriverSchedulePickup page) with query params
2. Pre-select the client based on URL params

**Example:**
```typescript
navigate(`/book?clientId=${suggestion.client_id}`);
```

Then update `DriverSchedulePickup.tsx` to read the `clientId` param and pre-select that client in the dialog.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/driver/RouteOptimizationSuggestions.tsx` | Replace navigation with driver-friendly scheduling flow |
| `src/components/driver/DriverSchedulePickupDialog.tsx` | (Optional) Accept `preSelectedClientId` prop for pre-fill |
| `src/pages/DriverSchedulePickup.tsx` | (Optional) Read clientId from URL params |

---

## Benefits

1. **No Access Denied**: Drivers stay within their permitted routes
2. **Faster Workflow**: Schedule directly from suggestions without extra navigation
3. **Consistent UX**: Uses existing driver scheduling flow
4. **Pre-filled Data**: Client and date are already known from the suggestion context
