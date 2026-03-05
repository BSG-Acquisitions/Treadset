

## Reorder Navigation Tabs

Current order: Dashboard, Clients, Pickups, Inventory, Trailers, Reports, Drop-offs

Desired order: **Dashboard, Clients, Pickups, Drop-offs, Trailers, Inventory, Reports**

### Change

**File:** `src/components/TopNav.tsx` (lines 225-384)

Reorder the nav items inside the `<nav>` element by moving the Drop-offs link (lines 378-384) to appear after the Pickups dropdown (after line 265), and keeping everything else in the new sequence. No content changes to any tab — just reordering the JSX blocks.

