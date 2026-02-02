
# Fix: "No Stops" Display Issue in Route Suggestions

## Problem Identified

After investigating, I found that the route suggestions feature IS working correctly:

1. **The edge function successfully returns suggestions** - When called with Tuesday's route data (1 stop at Special Way Car Center), it returned 6 overdue clients within 10 miles
2. **The "Along Route" tab is empty** - This is correct because no clients are within 2 miles of Tuesday's single stop
3. **The "Overdue" tab HAS suggestions** - 6 clients were found but you may have only looked at the default "Along Route" tab

## Root Cause

The user experience is confusing because:
1. The default tab ("Along Route") showed "No clients found within 2 miles" 
2. The user didn't realize suggestions existed in the "Overdue" tab
3. The frontend message still says "5 miles" but the backend now searches within 10 miles (inconsistent)

## Proposed Fix

Update the frontend to improve discoverability and fix the inconsistent messaging:

### File: `src/components/driver/RouteOptimizationSuggestions.tsx`

| Line | Current | Change To |
|------|---------|-----------|
| 145 | "No additional clients found within 5 miles" | "No additional clients found within 10 miles" |
| 41 | Default tab: `along-route` | Auto-select whichever tab has results first |

### Changes:

1. **Update the "no suggestions" message** to say "10 miles" to match the backend

2. **Auto-select the tab with results** - If "Along Route" is empty but "Overdue" has results, default to the "Overdue" tab

3. **(Optional) Add visual indicator** - Show a badge or highlight on the tab that has results

### Code Change for Auto-Tab Selection:

```typescript
// Before line 41:
const [activeTab, setActiveTab] = useState<string>('along-route');

// After (add logic to auto-select):
const defaultTab = useMemo(() => {
  if (alongRoute.length > 0) return 'along-route';
  if (overdue.length > 0) return 'overdue';
  return 'along-route';
}, [alongRoute.length, overdue.length]);

useEffect(() => {
  if (open) {
    setActiveTab(defaultTab);
  }
}, [open, defaultTab]);
```

## Expected Result

After this fix:
- If no clients are within 2 miles ("Along Route" empty) but there ARE overdue clients, the dialog will automatically show the "Overdue" tab
- The "no suggestions" message will correctly state "10 miles" to match the backend
- Users won't miss available suggestions
