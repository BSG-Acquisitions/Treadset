

## Give Dispatchers Access to Service Zones

Dispatchers need to see service zones to understand routing and client locations. This is a read-only need — they don't need to edit zones.

### Changes

1. **`src/components/TopNav.tsx`** — Add `'dispatcher'` to the role check for the Service Zones menu item (line 132).

2. **`src/App.tsx`** — Add `'dispatcher'` to the `ProtectedRoute` roles array for the `/service-zones` route (line 533).

Two lines changed, no new files.

