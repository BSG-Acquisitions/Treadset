

# Unified Navigation System

## The Problem

Your app has **two separate navigation systems** that show different items:

| Screen Size | Navigation Used | What Shows |
|-------------|----------------|------------|
| Desktop (xl+ / 1280px+) | **TopNav** (horizontal tabs) | 8 main tabs + User Menu dropdown |
| Tablet/Mobile (< 1280px) | **AppSidebar** (vertical) | 30+ items organized in categories |

This means when you shrink the window (or use tablet/phone), you see completely different features than on desktop. Specifically, these are **missing from desktop TopNav**:

| Category | Missing Items |
|----------|---------------|
| Scheduling | **Outbound Schedule** (the new feature!), Employees |
| Driver Portal | Driver Dashboard, My Routes, Add Pickup, Trailer Assignments |
| Hauler Portal | Hauler Dashboard, My Customers, My Manifests, Create Manifest, Independent Haulers, Hauler Rates |
| Inventory | Stock Levels, Products, **Shipments** |
| Reporting | **Michigan Reports** |
| Administration | Data Quality, Deployment, **Intelligence**, Receivers, Signatures |

## The Solution

Add dropdown menus to the TopNav that mirror the sidebar categories. This gives desktop users access to everything without cluttering the main tab bar.

### New TopNav Layout

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo]    [================Search================]    [Org] [Bell] [User]            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Dashboard | Clients | Routes ▾ | Inventory ▾ | Trailers ▾ | Reports ▾ | More ▾       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Structure

**Routes dropdown:**
- Today's Routes (current Routes tab destination)
- Outbound Schedule ← NEW

**Inventory dropdown:**
- Stock Levels
- Products
- Shipments

**Trailers dropdown:** (already exists, keep as-is)
- Inventory
- Routes
- Vehicles
- Driver Management
- Reports

**Reports dropdown:**
- Reports
- Analytics
- Michigan Reports

**More dropdown:** (catch-all for less frequent items)
- Drop-offs
- Employees
- Haulers
- Receivers
- Data Quality
- Intelligence
- Integrations
- Settings
- Deployment (admin only)

### User Menu Cleanup

Move these items FROM User Menu TO the "More" dropdown:
- Receiver Signatures → More
- Manifests → More
- Intelligence → More
- Haulers → More
- Receivers → More

Keep in User Menu:
- User info
- Settings (quick access duplicate)
- Booking Requests (with badge)
- Service Zones
- Sign out

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TopNav.tsx` | Convert flat tabs to dropdown menus, add "More" menu |

## Technical Approach

1. **Convert `navigationTabs` array** to grouped structure matching sidebar categories
2. **Add dropdown rendering** similar to existing Trailers dropdown pattern
3. **Create "More" overflow menu** for administrative/infrequent items
4. **Slim down User Menu** to only personal/account items

## Visual Comparison

### Current Desktop TopNav:
```text
Dashboard | Clients | Routes | Inventory | Trailers ▾ | Analytics | Reports | Drop-offs
```

### Proposed Desktop TopNav:
```text
Dashboard | Clients | Routes ▾ | Inventory ▾ | Trailers ▾ | Reports ▾ | More ▾
```

The dropdowns expose all the same content as the sidebar, just organized in menus rather than a vertical list.

## Role-Based Filtering

The dropdowns will respect the same role-based visibility rules as the sidebar:
- Drivers see Driver Portal items
- Haulers see Hauler Portal items
- Admins/ops_managers see administrative items
- Feature flags (TRAILERS, INVENTORY) still control visibility

## Result

After this change:
- Desktop users can access **all features** without resizing their browser
- Outbound Schedule is accessible via Routes → Outbound Schedule
- Michigan Reports accessible via Reports → Michigan Reports
- Shipments accessible via Inventory → Shipments
- Navigation is consistent between desktop and mobile/tablet views
- No more "hidden" features depending on screen size

