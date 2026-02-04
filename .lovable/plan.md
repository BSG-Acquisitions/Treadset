
# Outbound Manifest & Shipment Tracking System for State Compliance

## The Gap You Identified

Your compliance tracking currently only covers material **coming IN**. But the state requires tracking the full lifecycle:

| Movement Type | Current Status | What's Needed |
|--------------|----------------|---------------|
| Tires IN (from generators) | Fully tracked with manifests | None |
| Processed material OUT (sales) | Inventory transactions only | Manifests + destination tracking |
| Raw tires OUT (to other processors) | Not tracked | Full outbound manifests |

The state needs to know:
- Where material came from (you have this)
- What happened to it (processing - partially tracked)
- Where it went when it left (missing)

## Good News: Database Structure Exists

Your database already has the `shipments` table designed for exactly this, with fields for:
- Origin and destination entities
- Material form (whole tires, shreds, crumb, etc.)
- Direction (outbound)
- End use (processing, TDF, civil construction, etc.)
- Manifest reference
- BOL number and carrier

The entities table can track destination processors like the one Jody takes material to.

## What Will Be Built

### Phase 1: Outbound Shipment Management

**New Page: Material Shipments (/shipments)**
- List all outbound shipments with date, destination, material type, quantity, tonnage
- Filter by date range, destination, material type
- Link to associated manifests
- Historical data entry with backdating support

**New Hook: `useShipments`**
- CRUD operations for the shipments table
- Automatic tonnage calculation using conversion kernel
- Integration with entities (destinations)

### Phase 2: Destination Processor Management

**New Section in Entities or Dedicated Page**
- Add/edit destination processors (like the facility Jody takes tires to)
- Store MI registration numbers for compliance
- Contact information for documentation

### Phase 3: Driver Outbound Manifest Workflow

**New Driver Flow: Outbound Manifest Creation**
- Jody (or any driver) can create manifests when taking material OUT
- Capture: destination, material type, quantity, signatures
- Generate PDF manifest for outbound loads
- Same two-stage workflow (driver signature at origin, receiver signature at destination)

### Phase 4: Historical Data Entry

**Backfill Interface for Paper Manifests**
- Form to enter historical outbound manifests
- Date picker for actual shipment date
- All tire counts and tonnage
- Destination and end use
- Notes for any paper manifest reference numbers

### Phase 5: Reporting Integration

**Update Michigan Reports**
- Add "Outbound" tab showing material destinations
- Summary of material sent to each destination
- Tonnage by end use (processing, TDF, etc.)
- Net material balance (in - out = on site)

## Data Flow

```text
                     YOUR FACILITY
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     │                     ▼
 INBOUND                  │               OUTBOUND
 (generators)             │            (processors/buyers)
    │                     │                     │
    ├─ Manifests          │              ├─ Shipments table
    ├─ Dropoffs           │              ├─ Outbound manifests  
    └─ PTE counts         │              └─ Tonnage/PTE
                          │
              ┌───────────┴───────────┐
              │   INVENTORY STATUS    │
              │  (what's on site)     │
              │                       │
              │  In - Out = Current   │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   STATE REPORTS       │
              │  - Inbound summary    │
              │  - Outbound summary   │
              │  - End use breakdown  │
              │  - Net balance        │
              └───────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useShipments.ts` | CRUD operations for outbound shipments |
| `src/hooks/useEntities.ts` | Manage destination processors |
| `src/pages/Shipments.tsx` | Main shipments management page |
| `src/components/shipments/ShipmentDialog.tsx` | Create/edit shipment form |
| `src/components/shipments/ShipmentsList.tsx` | Filterable shipments list |
| `src/components/driver/DriverOutboundManifestWizard.tsx` | Driver workflow for outbound |
| `src/pages/driver/DriverOutboundCreate.tsx` | Driver outbound manifest page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MichiganReports.tsx` | Add Outbound tab with destination summary |
| `src/hooks/useMichiganReporting.ts` | Include outbound shipments in report data |
| `src/hooks/useRawMaterialProjections.ts` | Deduct outbound from on-site inventory |
| `src/App.tsx` | Add routes for new pages |

## UI Preview: Shipments Page

```text
┌─────────────────────────────────────────────────────────────────┐
│ Material Shipments                           + Record Shipment  │
├─────────────────────────────────────────────────────────────────┤
│ Filters: [Date Range ▼] [Destination ▼] [Material ▼] [Search]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Feb 3, 2026          XYZ Processing LLC                     │ │
│ │ 42 tons shredded     Driver: Jody Green                     │ │
│ │ BOL: BOL-2026-0042   End Use: Processing                    │ │
│ │ [View Manifest]      Status: Delivered ✓                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Jan 28, 2026         ABC Tire Recyclers                     │ │
│ │ 85 PTE whole tires   Driver: Jody Green                     │ │
│ │ BOL: BOL-2026-0038   End Use: Further Processing            │ │
│ │ [View Manifest]      Status: Delivered ✓                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Driver Outbound Workflow

Jody's workflow when taking a load to another processor:

1. **Select destination** - Pick from saved processors or add new
2. **Enter material** - Type (whole tires, shreds, etc.), quantity
3. **Capture signatures** - Driver signs at origin before departure
4. **Generate manifest PDF** - Print/email for driver to carry
5. **Complete at destination** - Receiver signs upon arrival
6. **Auto-sync to reports** - Tonnage flows to Michigan reports

## Backfill Historical Data

For the paper manifests Jody has been doing:

- Dedicated "Historical Entry" mode
- Pick shipment date in the past
- Enter all counts from paper manifest
- Reference original paper manifest number in notes
- Links to reporting immediately

## After Implementation

- **Complete audit trail**: Every tire in, every tire out
- **State-ready reports**: Accurate tonnage in AND out
- **Net inventory**: Real-time view of what's actually on site
- **Driver efficiency**: Jody can do digital manifests in the field
- **Historical catch-up**: All paper manifests can be entered with correct dates
