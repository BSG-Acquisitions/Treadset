

# Replace "My Routes" with Inventory in Top Nav Tabs

## Problem Identified

The current navigation tabs configuration shows:
- **"My Routes"** is restricted to users with **only** the `driver` role (line 66)
- **Inventory** was placed in the **user dropdown menu**, not in the main navigation tabs

Since you have admin access, you see "Routes" (for dispatchers/managers) but not "My Routes" (driver-only). And the new Inventory feature is buried in the user menu.

## Changes Required

### File: `src/components/TopNav.tsx`

| Lines | Action | Description |
|-------|--------|-------------|
| 66 | Replace | Change the "My Routes" tab entry to become the "Inventory" tab |
| 49-60 | Update | Add `inventory` to `getCurrentTab()` function |
| 215-222 | Remove | Delete the Inventory link from the user dropdown menu (it will now be in main nav) |

### Specific Changes

**1. Update `getCurrentTab()` function** (around line 49):
```typescript
if (location.pathname.startsWith('/inventory')) return 'inventory';
```

**2. Replace the "driver" tab with "inventory" tab** (line 66):
```typescript
// Before:
{ id: 'driver', label: 'My Routes', icon: UserCheck, path: '/routes/driver', roles: ['driver'] as const, featureFlag: null },

// After:
{ id: 'inventory', label: 'Inventory', icon: Boxes, path: '/inventory', roles: ['admin', 'ops_manager', 'dispatcher', 'viewer'] as const, featureFlag: 'INVENTORY' as const },
```

**3. Remove Inventory from user dropdown menu** (lines 215-222):
Delete the `FEATURE_FLAGS.INVENTORY` menu item since it will now be in the main nav.

## Result

- **Inventory** will appear as a main navigation tab (alongside Dashboard, Clients, Routes, etc.)
- Users with admin, ops_manager, dispatcher, or viewer roles will see it
- It respects the `INVENTORY` feature flag
- Cleaner user menu with one less item
- Drivers will still access their routes via the sidebar on mobile, or the `/routes/driver` URL directly

## Note on "My Routes"

The "My Routes" tab was driver-specific and won't affect your view since you have admin access. Drivers will still be able to access their routes through:
- The mobile sidebar navigation
- Direct URL `/routes/driver`
- The main "Routes" section if they also have dispatcher access

