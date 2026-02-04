
# Comprehensive Bidirectional Unit Conversion System for State Compliance Reporting

## Problem Statement

State compliance requires reporting **all material movement in weight (tons)**. Currently:
- Rubber mulch is sold by cubic yards but must be reported in tons
- Shred may be tracked in cubic yards or tons
- The system only has forward conversions (CY → tons) but not reverse
- End-of-year reports need to aggregate everything into tonnage regardless of how it was originally measured

## What Will Be Built

### 1. Complete Bidirectional Conversion Library

A centralized conversion utility that handles ALL unit conversions for processed tire products:

| From | To | Conversion Factor |
|------|-----|-------------------|
| **Rubber Mulch (your data)** | | |
| cubic_yards | tons | 0.41667 (1,000 lbs / 1.2 CY / 2,000) |
| cubic_yards | lbs | 833.33 |
| tons | cubic_yards | 2.4 (1 ton = 1.2 CY × 2) |
| tons | lbs | 2,000 |
| lbs | cubic_yards | 0.0012 (1.2 / 1,000) |
| lbs | tons | 0.0005 (1 / 2,000) |
| **Raw Tires (Michigan rule)** | | |
| PTE | tons | 0.01124 (1 / 89) |
| tons | PTE | 89 |
| PTE | cubic_yards | 0.1 |
| cubic_yards | PTE | 10 |

### 2. Material-Aware Conversion Function

Different materials have different densities. The system will support:

| Material Category | Density (lbs/CY) | Tons/CY |
|-------------------|-----------------|---------|
| Rubber Mulch | 833.33 | 0.417 |
| Shred (1-2") | ~500-600 | ~0.25-0.30 |
| Crumb Rubber | ~800-900 | ~0.40-0.45 |
| TDA (3-12") | ~400-500 | ~0.20-0.25 |

Default to rubber mulch density unless specified.

### 3. Updated Conversion Kernel (Edge Function)

Add all bidirectional conversions for processed materials:

```text
New Conversion Paths:
- tons_to_cubic_yards (rubber mulch)
- tons_to_lbs
- lbs_to_tons
- lbs_to_cubic_yards
- cubic_yards_to_lbs
```

### 4. Helper Functions for Reporting

Easy-to-use functions for state reporting:

```
convertToTons(quantity, fromUnit, materialType?) → tons
convertFromTons(tons, toUnit, materialType?) → quantity
getAnnualTonnage(transactions[]) → total tons for reporting
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/michigan-conversions.ts` | Add bidirectional conversion functions, material density constants |
| `supabase/functions/conversion-kernel/index.ts` | Add reverse conversions (tons→CY, lbs→tons, etc.) |
| `src/hooks/useRawMaterialProjections.ts` | Use centralized conversion functions |
| `src/hooks/useMichiganReporting.ts` | Import from centralized conversion lib |

## Technical Details

### New Constants (michigan-conversions.ts)

```typescript
// Processed material densities (lbs per cubic yard)
MATERIAL_DENSITIES: {
  rubber_mulch: 833.33,   // 1,000 lbs = 1.2 CY
  shred_1_inch: 550,      // ~1,100 lbs = 1 CY (denser)
  shred_2_inch: 500,      // ~1,000 lbs = 1 CY
  tda: 450,               // lighter, more air pockets
  crumb: 850,             // fine particles, denser
  default: 833.33         // use rubber mulch as default
}

// Bidirectional conversion functions
cubicYardsToTons(cy, material?)
tonsToCubicYards(tons, material?)
lbsToTons(lbs)
tonsToLbs(tons)
cubicYardsToLbs(cy, material?)
lbsToCubicYards(lbs, material?)
```

### Conversion Kernel Updates

```typescript
// Add reverse conversions
'tons_to_cubic_yards_mulch': 2.4,     // 1 ton = 2.4 CY rubber mulch
'tons_to_lbs': 2000,
'lbs_to_tons': 0.0005,
'lbs_to_cubic_yards_mulch': 0.0012,
'cubic_yards_to_lbs_mulch': 833.33,
```

## Compliance Reporting Flow

```text
                        ┌──────────────────────┐
                        │   Inventory Record   │
                        │   (any unit)         │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
            ┌───────────────┐              ┌───────────────┐
            │ Cubic Yards   │              │ Tons/Lbs      │
            │ (sales unit)  │              │ (weight unit) │
            └───────┬───────┘              └───────┬───────┘
                    │                              │
                    │   convertToTons()            │
                    └──────────────┬───────────────┘
                                   ▼
                        ┌──────────────────────┐
                        │   State Report       │
                        │   (always in TONS)   │
                        └──────────────────────┘
```

## After Implementation

- **All inventory** can be tracked in any unit (CY, tons, lbs)
- **State reports** automatically aggregate everything to tonnage
- **Accurate compliance**: The state gets precise weight data regardless of sales unit
- **Flexible product tracking**: Sell mulch by the yard, report by the ton
- **Future-proof**: Easy to add new material densities as needed
