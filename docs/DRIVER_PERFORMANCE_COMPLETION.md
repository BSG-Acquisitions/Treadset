# Driver Performance Analytics Module - Completion Report

## Overview
Admin-only driver performance analytics that computes and displays key operational metrics for each driver, with sortable columns and sparkline trend visualizations.

## Implementation Details

### Database Schema
- **Table**: `driver_performance_beta`
  - `id`: UUID primary key
  - `driver_id`: UUID (foreign key to users)
  - `organization_id`: UUID (foreign key to organizations)
  - **Performance Metrics**:
    - `avg_stops_per_day`: Average number of stops completed daily
    - `on_time_rate`: Percentage of on-time arrivals (0-100)
    - `avg_pickup_duration_minutes`: Average time spent per pickup
    - `avg_mileage_per_stop`: Average distance traveled between stops
  - **Supporting Data**:
    - `total_assignments`: Total assignments in period
    - `completed_assignments`: Successfully completed assignments
    - `on_time_arrivals`: Number of on-time arrivals
    - `total_miles_driven`: Total mileage in period
  - **Trend Data** (JSONB arrays for last 30 days):
    - `daily_stops_trend`: Daily stop counts
    - `on_time_trend`: Daily on-time percentages
  - **Metadata**:
    - `calculation_period_start`: Start of analysis period
    - `calculation_period_end`: End of analysis period
    - `last_calculated_at`: When metrics were last updated

### Security (RLS Policies)
1. **Admins and Ops can view driver performance** - SELECT policy for admin and ops_manager roles only
2. **Service role can manage driver performance** - Full access for edge function operations
3. **Drivers cannot view their own or others' performance data** - Zero visibility to driver role

### Edge Function: `calculate-driver-performance`
**Purpose**: Compute driver performance metrics from routes, pickups, and manifests

**Data Sources**:
- `assignments` - Driver assignments with dates and status
- `pickups` - Pickup locations and tire counts
- `locations` - Geographic coordinates for distance calculations

**Calculation Logic**:

1. **Average Stops Per Day**:
   - Total assignments / unique days with assignments
   - Calculated over 30-day rolling window

2. **On-Time Arrival Rate**:
   - Percentage of arrivals within 15 minutes of estimated time
   - Formula: `(on_time_arrivals / completed_assignments) * 100`
   - Color-coded badges: Green (≥90%), Yellow (≥75%), Red (<75%)

3. **Average Pickup Duration**:
   - Time between estimated and actual arrival
   - Measured in minutes
   - Only includes completed assignments

4. **Average Mileage Per Stop**:
   - Calculated using Haversine formula for great-circle distance
   - Measures straight-line distance between consecutive stops
   - Approximates actual driving distance

5. **Trend Data**:
   - Daily stops tracked for last 30 days
   - On-time rate tracked daily for sparkline visualization
   - Stored as JSONB arrays for efficient retrieval

**Performance Optimization**:
- Uses indexed queries on driver_id and calculation_period_end
- Batch processes all drivers by organization
- Upserts existing records to avoid duplicates
- Runs asynchronously for non-blocking execution

### React Components

#### `DriverPerformanceTable`
Location: `src/components/driver/DriverPerformanceTable.tsx`

**Features**:
- Sortable columns (click column headers to sort)
- Real-time sparkline graphs showing last 7 days of activity
- Color-coded on-time rate badges
- Manual refresh button for on-demand calculation
- Completion ratio display (e.g., "42/50 completed")
- Loading and empty states

**Column Definitions**:
1. **Driver** - Name and completion ratio
2. **Avg Stops/Day** - Daily stop average with icon
3. **On-Time Rate** - Percentage with color badge
4. **Avg Duration** - Minutes per pickup
5. **Miles/Stop** - Average mileage
6. **Trend** - 7-day sparkline graph

**Sorting**:
- Click any column header to sort
- Toggle between ascending/descending
- Persists during session
- Works with all metric types

**Visual Indicators**:
- User icon for driver names
- MapPin icon for stops
- CheckCircle2 icon for on-time rate
- Clock icon for duration
- Sparkline charts using Recharts
- Responsive design for mobile

#### Custom Hook: `useDriverPerformance`
Location: `src/hooks/useDriverPerformance.ts`

**Functions**:
1. `useDriverPerformance()` - Fetch latest performance metrics for all drivers
2. `useCalculateDriverPerformance()` - Trigger manual calculation

**Data Handling**:
- Joins with users table to get driver names
- Filters to most recent calculation per driver
- Includes 30-day trend data
- Auto-refreshes after recalculation

### Integration

#### Employees Page
Location: `src/pages/Employees.tsx`

**Placement**:
- Positioned between stats grid and employee directory
- Only visible to Admin and Ops Manager roles
- Full-width card for maximum data visibility
- Animated slide-up entrance

**Role-Based Access**:
```typescript
{hasAnyRole(['admin', 'ops_manager']) && (
  <DriverPerformanceTable />
)}
```

### Scheduled Updates

The edge function can be configured to run nightly at midnight:

```sql
SELECT cron.schedule(
  'calculate-driver-performance-nightly',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT net.http_post(
    url:='https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/calculate-driver-performance',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

## Key Metrics Explained

### On-Time Rate
- **Definition**: Percentage of completed pickups where actual arrival was within 15 minutes of estimated time
- **Calculation**: `(arrivals within 15 min / total completed) * 100`
- **Benchmarks**:
  - Excellent: ≥90% (green badge)
  - Good: 75-89% (yellow badge)
  - Needs Improvement: <75% (red badge)

### Average Stops Per Day
- **Definition**: Total assignments divided by unique days worked
- **Purpose**: Measures daily productivity and workload
- **Use Case**: Identify high performers and balance routes

### Average Pickup Duration
- **Definition**: Average time from estimated to actual arrival
- **Purpose**: Measures efficiency at each stop
- **Factors**: Traffic, location complexity, tire volume

### Average Mileage Per Stop
- **Definition**: Distance traveled between consecutive stops
- **Calculation**: Haversine formula (great-circle distance)
- **Purpose**: Route optimization and fuel cost estimation

## Features Delivered

✅ **Computed Metrics** - Four key performance indicators per driver
✅ **Sortable Table** - Click-to-sort on all columns
✅ **Sparkline Graphs** - Visual 7-day trend indicators
✅ **Admin-Only Access** - No visibility to drivers themselves
✅ **Manual Refresh** - On-demand recalculation
✅ **30-Day Analysis** - Rolling window for trend analysis
✅ **Persistent Storage** - All calculations saved to database
✅ **Role-Based Security** - RLS policies enforce access control
✅ **Nightly Updates** - Configurable cron job support
✅ **Performance Optimized** - Indexed queries and batch processing

## Privacy & Security

### Driver Visibility
- **Drivers CANNOT see**:
  - Their own performance metrics
  - Other drivers' performance metrics
  - Any data from `driver_performance_beta` table
- **Only Admin and Ops Manager can access** this data
- RLS policies enforce this at the database level

### Data Privacy
- Performance data never exposed in driver-facing UI
- Edge function uses service role for secure computation
- All queries filtered by organization_id for multi-tenancy

## Usage Instructions

### For Admins/Ops Managers
1. Navigate to Admin → Employees page
2. View the "Driver Performance Analytics" card
3. Sort by any column to identify top/bottom performers
4. Review sparkline trends for recent patterns
5. Click refresh icon to recalculate on-demand

### For Developers
To manually trigger calculation:
```typescript
import { useCalculateDriverPerformance } from '@/hooks/useDriverPerformance';

const calculate = useCalculateDriverPerformance();
calculate.mutate();
```

To fetch performance data:
```typescript
import { useDriverPerformance } from '@/hooks/useDriverPerformance';

const { data: performance, isLoading } = useDriverPerformance();
```

## Performance Considerations
- Calculations run asynchronously to avoid blocking
- Results cached in database for fast retrieval
- Indexes on driver_id and calculation_period_end
- Batch processing by organization
- Nightly updates minimize real-time computation

## Future Enhancements (Post-Phase 3)
- Driver comparison charts
- Historical trend analysis (90 days, 6 months)
- Export performance reports to PDF
- Configurable benchmarks per organization
- Driver incentive tracking
- Fuel efficiency metrics
- Customer satisfaction correlation

## Testing Checklist
- [x] Database table created with proper RLS
- [x] Edge function calculates all metrics correctly
- [x] Haversine distance formula verified
- [x] Component renders on Employees page
- [x] Role-based visibility enforced (admin/ops only)
- [x] Drivers cannot see performance data
- [x] Sortable columns work correctly
- [x] Sparkline graphs display properly
- [x] Manual refresh triggers recalculation
- [x] Loading and empty states work
- [x] Toast notifications display
- [x] Data persists correctly

---

**Status**: ✅ Complete
**Phase**: 3
**Module**: Driver Performance Analytics
**Last Updated**: 2025-11-04
