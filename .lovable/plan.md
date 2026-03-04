

## Fix Driver Trailer Assignment Visibility

The "Start Route" button IS working (the "Route updated" toast fired), but the UI has two problems: the driver can't see which trailer they're assigned to, and stops don't show what actions are needed until expanded.

### Changes to `src/pages/DriverTrailerAssignments.tsx`

1. **Show trailer number prominently on the route card** — Display the route's assigned trailer (from `route.trailer`) as a visible badge/line next to the vehicle info, so the driver knows which trailer to grab.

2. **Show planned events preview on each stop when collapsed** — Below the location name, render a compact list of planned events (e.g. "Pick Up Empty #T-101", "Drop Full #T-102") so the driver can see at a glance what to do at each stop without needing to expand it.

3. **Fix stop expansion click handling** — The `CollapsibleTrigger` on stops has the same nested-button issue. Add `e.stopPropagation()` to ensure tapping a stop reliably expands it.

4. **Auto-expand route after starting** — The code already does this, but ensure the route card visually updates (border highlight + expanded stops) after the status mutation completes and data refetches.

