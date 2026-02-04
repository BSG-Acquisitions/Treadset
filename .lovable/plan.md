

# Raw Material Projections System

## Overview

Build a system that connects tire intake data to projected inventory weight, showing you how much potential product (in tons) you have in your yard based on tires coming through the door. This uses Michigan's 89 PTE/ton conversion rule to project raw material weight from tire counts.

---

## What You'll Get

### 1. New "Raw Material Projections" Card on Inventory Page

A prominent card showing:
- **Unprocessed Tire Weight**: Total tons of tires in the yard awaiting processing
- **This Month's Intake**: PTE and tons received this month
- **Daily Average**: Average daily intake rate
- **Projected Monthly Total**: Based on current pace

### 2. New "Projections" Tab on Inventory Page

A dedicated tab showing:

| Section | Description |
|---------|-------------|
| **Raw Material Summary** | Current unprocessed tire weight (tons), total PTE in yard |
| **Intake vs Output Chart** | Visual comparison of tires coming in vs processed materials going out |
| **Conversion Potential** | How many tons of shred, mulch, TDA could be made from current raw materials |
| **Trend Analysis** | Weekly/monthly intake trends with forecasting |

### 3. Intake Tracking

Track tire intake from multiple sources:
- **Manifests**: Pickup tires brought in (using all tire fields)
- **Drop-offs**: Walk-in customer tires
- Both converted to PTE then to tons using Michigan's 89 PTE = 1 ton rule

---

## How Projections Work

### Conversion Formula

```text
Tires In → PTE → Tons → Potential Product

Example:
- 890 passenger tires (PTE) = 890 PTE
- 18 semi tires = 90 PTE
- Total: 980 PTE = 11.01 tons raw material
```

### Tracking Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        TIRE INTAKE                                   │
│  ┌─────────────┐    ┌─────────────┐                                 │
│  │  Manifests  │    │  Drop-offs  │                                 │
│  │  (Pickups)  │    │  (Walk-ins) │                                 │
│  └──────┬──────┘    └──────┬──────┘                                 │
│         │                  │                                        │
│         └────────┬─────────┘                                        │
│                  ▼                                                  │
│         ┌───────────────┐                                           │
│         │ Calculate PTE │  (1 PTE, 5 semi, 15 OTR)                  │
│         └───────┬───────┘                                           │
│                 ▼                                                   │
│         ┌───────────────┐                                           │
│         │ Convert Tons  │  (÷ 89 PTE/ton)                           │
│         └───────┬───────┘                                           │
│                 ▼                                                   │
│         ┌───────────────┐                                           │
│         │ Raw Material  │ ◄─── Unprocessed tire weight              │
│         │   Inventory   │                                           │
│         └───────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESSING                                      │
│         ┌───────────────┐                                           │
│         │  Shred/Grind  │                                           │
│         └───────┬───────┘                                           │
│                 ▼                                                   │
│         ┌───────────────┐                                           │
│         │   Finished    │ ◄─── Inventory products                   │
│         │   Products    │      (shred, mulch, TDA, etc.)            │
│         └───────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Experience

### Inventory Page Updates

The existing stats row will be enhanced with a new "Raw Materials" card:

| Card | Description |
|------|-------------|
| Total Products | (existing) Count of product types |
| Low Stock | (existing) Products below threshold |
| Out of Stock | (existing) Products at zero |
| **Raw Materials** | **NEW**: Unprocessed tire weight in tons |

### New Projections Tab

Add a third tab to the inventory page:
- Stock Levels (existing)
- Transaction History (existing)  
- **Raw Material Projections** (new)

This tab will show:
1. Current raw material weight (tons in yard)
2. This period's intake (tires → PTE → tons)
3. Processing rate (how fast you're converting to product)
4. Projection charts

---

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useRawMaterialProjections.ts` | Hook to aggregate tire intake and calculate projections |
| `src/components/inventory/RawMaterialCard.tsx` | Summary card for raw material weight |
| `src/components/inventory/ProjectionsTab.tsx` | Full projections view with charts |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Inventory.tsx` | Add Raw Materials card and Projections tab |
| `src/lib/michigan-conversions.ts` | Add helper for aggregating intake to tons |

### Data Sources

The projections hook will query:
1. **Manifests table**: `pte_on_rim`, `pte_off_rim`, `commercial_*`, `otr_count`, `tractor_count`
2. **Dropoffs table**: `pte_count`, `otr_count`, `tractor_count`
3. **Inventory transactions**: To calculate processing output

### Key Calculations

```typescript
// Raw Material Projections Hook
interface RawMaterialProjections {
  // Current state
  totalUnprocessedPTE: number;
  totalUnprocessedTons: number;
  
  // This period intake
  periodIntakePTE: number;
  periodIntakeTons: number;
  dailyAveragePTE: number;
  dailyAverageTons: number;
  
  // Processing output (from inventory inbound transactions)
  periodProcessedTons: number;
  processingRate: number; // tons processed per day
  
  // Projections
  projectedMonthEndTons: number;
  daysOfSupplyRemaining: number; // at current processing rate
  
  // Breakdown
  intakeBySource: {
    manifests: { pte: number; tons: number };
    dropoffs: { pte: number; tons: number };
  };
}
```

### Conversion Logic

Using existing Michigan utilities:
- `calculateManifestPTE()` for manifest tire counts
- `calculateTotalPTE()` for dropoff tire counts
- `pteToTons()` for final conversion (÷ 89)

---

## Reports Integration

The projections data will also be available in the Inventory Reports page:
- Add "Raw Materials" section to reports
- Show intake vs output trends over time
- Include in CSV exports

---

## Result

After implementation:
- See **real-time raw material weight** in tons on the Inventory page
- Track **intake trends** from all tire sources (pickups + walk-ins)
- Understand **processing velocity** (how fast you're converting tires to product)
- Project **future inventory levels** based on current rates
- Make informed decisions about processing schedules and sales

