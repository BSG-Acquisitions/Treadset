# Revenue Forecasting Engine - Setup Guide

## Overview
AI-powered revenue forecasting system that analyzes historical manifest and pickup data to generate 30, 60, and 90-day revenue projections with confidence intervals.

## Features
- ✅ Rolling average calculations with seasonal weighting
- ✅ Growth rate analysis based on last 6 months
- ✅ Confidence levels (low/medium/high) based on data variance
- ✅ Interactive line chart with confidence interval shading
- ✅ CSV export functionality
- ✅ Date range selection (30/60/90 days)
- ✅ Nightly automatic refresh at midnight

## Architecture

### Data Flow
1. **Historical Analysis**: Reads last 6 months of completed manifests
2. **Calculation**: Applies rolling averages, growth trends, and seasonal weights
3. **Storage**: Caches results in `revenue_forecasts_beta` table
4. **Display**: Dashboard widget renders forecasts with charts
5. **Refresh**: Nightly cron job updates forecasts automatically

### Components

**Edge Function**: `calculate-revenue-forecast`
- Location: `supabase/functions/calculate-revenue-forecast/index.ts`
- Reads from: `manifests`, `organization_settings`
- Writes to: `revenue_forecasts_beta`
- Calculations:
  - Monthly revenue aggregation
  - Rolling 6-month average
  - Growth rate (last 3 months vs previous 3)
  - Seasonal adjustment factor
  - Confidence scoring based on variance

**UI Widget**: `ProjectedRevenueWidget`
- Location: `src/components/dashboard/ProjectedRevenueWidget.tsx`
- Features:
  - Line chart with confidence interval area
  - 30/60/90-day range selector
  - Real-time forecast display
  - CSV export button
  - Growth rate indicator

**Data Hook**: `useRevenueForecasts`
- Location: `src/hooks/useRevenueForecasts.ts`
- Fetches cached forecasts from beta table

## Nightly Refresh Schedule

The forecast is automatically recalculated every night at midnight (EST) using pg_cron.

**Cron Job**: `nightly-revenue-forecast`
```sql
'0 0 * * *' -- Runs at 00:00 (midnight) daily
```

To manually trigger a forecast update:
```bash
curl -X POST https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/calculate-revenue-forecast \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Database Schema

**Table**: `revenue_forecasts_beta`
```sql
- id: UUID (primary key)
- organization_id: UUID (foreign key)
- forecast_month: DATE (target forecast date)
- predicted_revenue: NUMERIC(10,2)
- confidence_level: TEXT (low/medium/high)
- based_on_months: INTEGER (data points used)
- growth_rate: NUMERIC(5,2) (percentage)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Forecast Methodology

### 1. Base Revenue Calculation
- Averages last 6 months of manifest revenue
- Scales by forecast horizon (30/60/90 days)

### 2. Growth Trend Adjustment
- Compares recent 3 months vs previous 3 months
- Applies growth rate to base forecast

### 3. Seasonal Weighting
- Analyzes variance from monthly average
- Adjusts forecast based on seasonal patterns

### 4. Confidence Scoring
- **High**: Coefficient of variation < 0.2 (stable revenue)
- **Medium**: CV between 0.2 and 0.4 (moderate variance)
- **Low**: CV > 0.4 (high variance)

### 5. Confidence Intervals
- Upper bound: +15% of predicted revenue
- Lower bound: -15% of predicted revenue
- Displayed as shaded area on chart

## CSV Export Format
```csv
Forecast Date,Predicted Revenue,Confidence,Growth Rate
2025-12-03,45000.50,high,12.5
2025-01-02,47250.75,high,12.5
2026-02-01,49500.25,medium,12.5
```

## Dashboard Integration

The widget appears on the main admin dashboard (`/`) below the environmental impact card and above quick actions.

**Access Requirements**: Admin, Ops Manager roles only

## Testing

To test the forecasting engine:

1. Generate test data (if needed):
```sql
-- Ensure you have completed manifests in the last 6 months
SELECT COUNT(*) FROM manifests 
WHERE status = 'COMPLETED' 
  AND created_at > NOW() - INTERVAL '6 months';
```

2. Manually trigger forecast calculation:
```bash
# From Supabase Functions page or via curl
curl -X POST [function-url]/calculate-revenue-forecast
```

3. Verify data in database:
```sql
SELECT * FROM revenue_forecasts_beta 
ORDER BY forecast_month ASC;
```

4. Check dashboard widget at `/`

## Troubleshooting

**No forecast data showing:**
- Check if you have completed manifests in last 6 months
- Verify edge function deployed successfully
- Check `revenue_forecasts_beta` table has data

**Inaccurate predictions:**
- Review historical manifest data quality
- Check organization_settings for correct default rates
- Increase data history (more than 6 months improves accuracy)

**Cron job not running:**
- Verify pg_cron and pg_net extensions enabled
- Check cron job exists: `SELECT * FROM cron.job WHERE jobname = 'nightly-revenue-forecast'`
- Review edge function logs for errors

## Deployment Status

✅ Phase 2: Intelligence Modules - Revenue Forecasting Engine
- Edge function deployed
- UI widget integrated
- Nightly refresh scheduled
- Logged in system_updates

**Next Steps**: Monitor accuracy over 30 days, adjust seasonal weights if needed.
