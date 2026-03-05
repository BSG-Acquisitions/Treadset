

## Plan: Add Week Navigation to Route Planning

### Problem
The Week View tab shows `currentWeek` but has no prev/next week buttons — the `goToPreviousWeek` and `goToNextWeek` functions exist (lines 125-126) but are never rendered in the UI. The day navigator in the header only controls the "Today's Routes" tab. Users cannot browse past or future weeks.

### Changes

**File: `src/pages/EnhancedRoutesToday.tsx`**

1. **Add week navigation arrows inside the Week View tab** (around line 554-556): Add ChevronLeft/ChevronRight buttons flanking the "Week of Mar 2, 2026" header, plus a "This Week" reset button. Uses the existing `goToPreviousWeek`, `goToNextWeek` functions already defined on lines 125-126.

2. **Sync day and week navigation**: When the user changes the active day (prev/next day buttons), also update `currentWeek` to match so the Week View always shows the week containing the active day. Add a `useEffect` that sets `currentWeek` from `activeDay` whenever it changes.

3. **Rename tab labels for clarity**: Change "Today's Routes" → "Day View" since it already supports navigating to any day, not just today. This makes the Day View / Week View naming consistent.

### Result
- Week View tab gets its own prev/next week arrows and a "This Week" button
- Navigating days in Day View keeps the Week View in sync
- Users can browse any week — past, present, or future

