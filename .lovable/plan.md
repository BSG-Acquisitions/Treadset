
# Historical Intake Averages for Production Capacity Planning

## The Business Need

You need to know your average monthly intake capacity to confidently commit to buyer orders. For example:
- Buyer wants 100-200 tons of shredded material per month
- You need to know: "On average, how much raw material am I bringing in?"
- This helps you determine if you can fulfill that order consistently

## Your Historical Data (What I Found)

Based on your database, here's your intake by month:

| Month | Manifests | Dropoffs | Total PTE | Approx Tons |
|-------|-----------|----------|-----------|-------------|
| Feb 2026 | 7 loads | 2 | 3,652 PTE | ~41 tons |
| Jan 2026 | 116 loads | 21 | 25,704 PTE | ~289 tons |
| Dec 2025 | 146 loads | 43 | 46,826 PTE | ~526 tons |
| Nov 2025 | 99 loads | 26 | 20,793 PTE | ~234 tons |
| Oct 2025 | 23 loads | 9 | 6,111 PTE | ~69 tons |
| Sep 2025 | 2 loads | 1 | 192 PTE | ~2 tons |

**3-Month Average (Nov-Jan):** ~350 tons/month
**6-Month Average:** ~193 tons/month (includes ramp-up months)

## What Will Be Built

### 1. Historical Averages Section in Projections Tab

A new card showing:
- **3-Month Rolling Average** (most relevant for capacity planning)
- **6-Month Rolling Average** (longer trend view)
- **Monthly breakdown bar chart** (visual history)
- **Capacity indicator**: "Can you fulfill X tons/month?"

### 2. Capacity Planning Helper

Simple visualization showing:
- Your average intake vs a target order size
- Color-coded indicator (green = safe, yellow = tight, red = insufficient)

## UI Preview

```text
┌─────────────────────────────────────────────────────────────┐
│ Historical Intake Averages                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 3-Month Avg │  │ 6-Month Avg │  │ Peak Month  │         │
│  │  350 tons   │  │  193 tons   │  │  526 tons   │         │
│  │   /month    │  │   /month    │  │  (Dec 2025) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  Monthly Intake Trend                                       │
│  ────────────────────                                       │
│  Dec ████████████████████████ 526t                         │
│  Jan ████████████████ 289t                                 │
│  Nov ████████████ 234t                                     │
│  Oct ████ 69t                                              │
│  Feb ██ 41t (partial)                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useRawMaterialProjections.ts` | Add new hook or extend to fetch multi-month historical data |
| `src/components/inventory/ProjectionsTab.tsx` | Add Historical Averages card with monthly bar chart |

## Technical Approach

### New Hook: `useHistoricalIntakeAverages`

```typescript
// Returns:
{
  monthlyData: Array<{
    month: Date;
    manifests: { count: number; pte: number; tons: number };
    dropoffs: { count: number; pte: number; tons: number };
    totalPTE: number;
    totalTons: number;
  }>;
  threeMonthAvgTons: number;
  sixMonthAvgTons: number;
  peakMonth: { month: Date; tons: number };
  averageLoadsPerMonth: number;
}
```

### UI Components

1. **Summary Cards Row**: 3-month avg, 6-month avg, peak month
2. **Bar Chart**: Monthly intake over time (using existing Recharts)
3. **Trend Indicator**: Are you trending up or down vs historical average?

## After Implementation

You'll be able to:
- See at a glance your average monthly intake (~350 tons based on recent data)
- Confidently tell a buyer: "Yes, I can fulfill 100-200 tons/month"
- Identify seasonal patterns (e.g., December was your highest month)
- Track whether your capacity is growing or shrinking over time
