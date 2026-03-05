

## Plan: Move Week Navigation to Top Header

The week navigation (prev/next week arrows + "Week of Mar 1, 2026" + "This Week" button) is currently buried inside the Week View tab content (lines 561-578). The user wants it up in the main header bar (lines 275-286) alongside the day navigation and Schedule Pickup button.

### Change

**File: `src/pages/EnhancedRoutesToday.tsx`**

1. **Make the header navigation context-aware**: Track the active tab value in state. When "Day View" is active, show the day nav (prev/next day + Today). When "Week View" is active, show the week nav (prev/next week + "Week of..." + This Week). This keeps the top bar clean — only one set of navigation controls at a time.

2. **Remove the duplicate week nav** from inside the Week View tab content (lines 561-578) since it will now live in the header.

3. **Add tab state**: Change `<Tabs defaultValue="today">` to a controlled component with `value={activeTab}` and `onValueChange={setActiveTab}` so the header knows which nav to render.

### Result
- Header shows day arrows when on Day View, week arrows when on Week View
- Week navigation is prominent and easy to access at the top of the page
- No duplicate controls

