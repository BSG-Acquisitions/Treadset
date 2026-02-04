

# Add Navigation Links to Material Shipments Page

## Current Situation

The Material Shipments page exists at `/shipments` with full functionality for:
- Recording outbound shipments (including backdated historical entries)
- Filtering and searching shipments
- Auto-calculating tonnage for state compliance
- Flowing data into Michigan Reports

However, there's currently no easy way to navigate to it from the main app - you have to type the URL directly.

## What Will Be Added

### 1. Add Link from Inventory Page

Add a prominent button/card to the Inventory page since outbound shipments are closely related to inventory tracking:

Location: In the Quick Actions card or as a new summary card
Label: "Outbound Shipments" or "Material Shipments"
Icon: Truck

### 2. Add to Navigation Sidebar

Add "Shipments" to the sidebar navigation under the Inventory section:

```
Inventory
├── Stock Levels
├── Products  
└── Shipments (NEW)
```

### 3. Add to Projections Tab

Since the Projections tab shows raw material data and historical averages, add a link there to record outbound shipments for complete material flow tracking.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Inventory.tsx` | Add Shipments link in Quick Actions or as new card |
| `src/components/AppSidebar.tsx` | Add Shipments nav item under inventory section |
| `src/components/inventory/ProjectionsTab.tsx` | Add link to record outbound shipments |

## Quick Actions Card Enhancement (Inventory.tsx)

Add a new button in the Quick Actions section:

```
Quick Actions
├── Inbound (existing)
├── Outbound (existing)  
├── Reports (existing)
└── Shipments (NEW - links to /shipments)
```

Or add a dedicated summary card showing outbound shipment stats with a link.

## Sidebar Navigation Update (AppSidebar.tsx)

Add to the inventory section:

```typescript
inventory: [
  { id: 'inventory', label: 'Stock Levels', icon: Package, path: '/inventory' },
  { id: 'inventory-products', label: 'Products', icon: PackageOpen, path: '/inventory/products' },
  { id: 'shipments', label: 'Shipments', icon: Truck, path: '/shipments' }, // NEW
],
```

## Result

After this change:
- You can easily navigate to `/shipments` from multiple places in the app
- The outbound shipment tracking is discoverable and accessible
- Historical paper manifests can be entered quickly by clicking through from Inventory
- Complete material flow (in and out) is visible from one logical location

