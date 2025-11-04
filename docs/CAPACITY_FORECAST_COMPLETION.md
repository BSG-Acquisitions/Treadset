# Capacity Forecast Preview - Implementation Complete

## Overview
Implemented a predictive capacity forecast card that estimates tire volume and truck capacity for the next 7 days, displayed with color-coded capacity indicators.

## Features Implemented

### 1. Database Schema (`capacity_preview_beta` table)
- **Columns:**
  - `id`: UUID primary key
  - `organization_id`: Foreign key to organizations
  - `forecast_date`: Date of the forecast
  - `predicted_tire_volume`: Estimated number of tires (PTEs)
  - `predicted_truck_capacity`: Maximum truck capacity
  - `capacity_percentage`: Utilization percentage
  - `capacity_status`: Status indicator (normal, warning, critical)
  - `created_at`, `updated_at`: Timestamps

- **RLS Policies:**
  - Admin and Ops Manager can view forecasts
  - Service role can manage all forecasts

- **Indexes:**
  - Composite index on `organization_id` and `forecast_date` for fast lookups

### 2. Edge Function (`calculate-capacity-forecast`)
**Location:** `supabase/functions/calculate-capacity-forecast/index.ts`

**Functionality:**
- Analyzes historical pickup data from the last 30 days to establish baseline
- Calculates average daily tire volume
- Fetches scheduled pickups for next 7 days
- Predicts capacity for each day based on:
  - Scheduled pickups (if available)
  - Historical averages with ±10% variation (for unscheduled days)
- Converts tire counts to PTE equivalents:
  - PTE: 1x
  - OTR: 1.5x
  - Tractor: 2x
- Calculates capacity percentage against truck capacity
- Determines status:
  - **Normal (Green)**: < 80%
  - **Warning (Yellow)**: 81-95%
  - **Critical (Red)**: > 95%
- Stores predictions in `capacity_preview_beta`

**Parameters:**
- `organization_id`: Required

**Response:**
```json
{
  "success": true,
  "forecasts": [...],
  "summary": {
    "avgDailyVolume": 150,
    "truckCapacity": 100,
    "daysAnalyzed": 25
  }
}
```

### 3. React Hook (`useCapacityForecast`)
**Location:** `src/hooks/useCapacityForecast.ts`

**Methods:**
- `useCapacityForecast(organizationId)`: Fetches forecast data
- `generateForecast(orgId)`: Triggers edge function to recalculate

**Features:**
- Automatic query invalidation on refresh
- Loading states for both fetch and generation
- Enabled only when organization ID is available

### 4. UI Component (`CapacityForecastCard`)
**Location:** `src/components/intelligence/CapacityForecastCard.tsx`

**Features:**
- **Summary Metrics:**
  - Peak day volume (highest predicted PTEs)
  - Average capacity percentage across 7 days

- **Bar Chart Visualization:**
  - Daily tire volume predictions
  - Color-coded bars based on capacity status
  - Interactive tooltip with:
    - Full date
    - Volume in PTEs
    - Capacity percentage
    - Status badge

- **Capacity Legend:**
  - Green: < 80% (Normal operations)
  - Yellow: 81-95% (Approaching capacity)
  - Red: > 95% (Critical capacity)

- **Manual Refresh:**
  - Button to recalculate forecasts on-demand
  - Loading spinner during generation
  - Toast notifications for success/failure

- **Responsive Design:**
  - Uses Recharts for smooth, responsive visualization
  - Semantic color tokens from design system
  - Mobile-friendly layout

### 5. Dashboard Integration
**Location:** `src/pages/Index.tsx`

- Added to admin dashboard grid alongside:
  - AI Insights Card
  - Revenue Forecast Card
- Visible only to Admin and Ops Manager roles
- Part of staggered animation sequence

## Design System Integration

### Color Tokens Used
```css
--success: 142 71% 45%;    /* Green - Normal capacity */
--warning: 38 92% 50%;      /* Yellow - Warning */
--destructive: 0 84.2% 60.2%;  /* Red - Critical */
```

### Theme Compatibility
- Fully supports light and dark modes
- Uses semantic tokens for all colors
- Consistent with existing design system

## Data Flow

1. **Historical Analysis:**
   - Fetches completed pickups from last 30 days
   - Calculates daily average tire volume
   - Groups by date for pattern recognition

2. **Scheduled Pickups:**
   - Queries pickups with `scheduled` or `assigned` status
   - Covers next 7 days from current date

3. **Prediction Logic:**
   - If scheduled pickups exist: Use actual counts
   - If no scheduled pickups: Use historical average ± 10% random variation
   - Convert all tire types to PTE equivalents

4. **Capacity Calculation:**
   - Compare predicted volume to truck capacity (from org settings)
   - Calculate percentage utilization
   - Assign status based on thresholds

5. **Caching:**
   - Store predictions in database
   - Replace existing forecasts for date range on refresh
   - Enables fast retrieval without recalculation

## Usage

### For Admins & Ops Managers
1. View the Capacity Forecast card on the main dashboard
2. See 7-day predictions at a glance
3. Identify potential capacity issues (yellow/red bars)
4. Click "Refresh" to recalculate with latest data

### Automatic Updates
To enable automatic daily updates, configure a cron job or scheduled edge function:
```sql
-- Example: Run daily at 6 AM EST
-- Via pg_cron or external scheduler
SELECT cron.schedule(
  'capacity-forecast-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/calculate-capacity-forecast',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body:='{"organization_id": "your-org-id"}'::jsonb
  );
  $$
);
```

## Security

- **RLS Policies:** Only Admin and Ops Manager can read forecasts
- **Edge Function:** Service role handles all writes
- **API:** No direct write access from frontend
- **Organization Isolation:** All queries filtered by organization_id

## Performance Considerations

- **Indexed Queries:** Fast lookups via composite index
- **Historical Limit:** Only analyzes last 30 days to keep queries fast
- **Batch Operations:** Single query per day in forecast window
- **Caching:** Avoids recalculation on every page load

## Future Enhancements

1. **Machine Learning:** More sophisticated prediction models
2. **Weather Integration:** Factor in weather impacts on tire volume
3. **Seasonal Patterns:** Detect and apply seasonal adjustments
4. **Capacity Alerts:** Automated notifications for critical days
5. **Multi-week View:** Extend forecast to 14 or 30 days
6. **Driver Assignment Suggestions:** Recommend scheduling based on forecasts

## Status
✅ **COMPLETE** - Predictive Capacity Preview ready
