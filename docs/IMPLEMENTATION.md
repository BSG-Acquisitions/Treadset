# Implementation Notes

## Route Planner

### Core Assumptions

- **Vehicle Capacity**: Default capacity of 10 units per vehicle if not specified
- **Service Time**: 15 minutes per stop for pickup/delivery operations
- **Travel Speed**: Average of 30 mph for distance-to-time calculations
- **Working Hours**: 8 AM to 5 PM Monday-Friday (configurable per organization)
- **Time Windows**: 
  - AM: 8:00 AM - 12:00 PM
  - PM: 12:00 PM - 5:00 PM
  - Evening: 5:00 PM - 8:00 PM (premium pricing)

### Route Optimization

The route planner uses a greedy insertion algorithm:

1. **Initial Routes**: Start with depot coordinates for each vehicle
2. **Distance Calculation**: Haversine formula for coordinate-based distances
3. **Insertion Logic**: Find the position in existing routes that minimizes additional travel time
4. **Capacity Constraints**: Ensure vehicle capacity is not exceeded (PTE + OTR + Tractor counts)
5. **Time Window Constraints**: Respect customer preferred pickup windows
6. **Route Scoring**: Minimize total travel time while respecting constraints

### Limitations

- **Real-time Traffic**: Not considered in current implementation
- **Driver Breaks**: Not factored into scheduling
- **Multi-day Planning**: Currently focuses on single-day optimization
- **Complex Constraints**: Vehicle-specific restrictions not yet implemented

## Geocoding Service

### Google Maps Integration

- **API Usage**: Places Autocomplete for address input, Geocoding API for coordinate resolution
- **Rate Limits**: 
  - Places Autocomplete: 1,000 requests per minute
  - Geocoding API: 50 requests per second
- **Caching Strategy**: Coordinates cached in `locations` table to reduce API calls
- **Fallback**: Nominatim OSM geocoding as backup (implemented in edge functions)

### Error Handling

- **Invalid Addresses**: Graceful degradation with manual coordinate entry
- **API Limits**: Queue requests and retry with exponential backoff
- **Offline Mode**: Use cached coordinates when geocoding service unavailable

## Rate Limiting & Caching

### Edge Function Rate Limits

- **Public Booking**: 10 requests per minute per IP to prevent abuse
- **Route Planning**: 100 requests per hour per authenticated user
- **CSV Operations**: 5 imports per hour per organization

### Database Caching

- **Client Data**: React Query with 5-minute staleness
- **Route Data**: 1-minute cache for today's routes
- **Vehicle Status**: Real-time updates via Supabase subscriptions
- **Pricing Tiers**: 1-hour cache (rarely changes)

### Performance Optimizations

- **Batch Operations**: CSV import processes in chunks of 100 records
- **Lazy Loading**: Route details loaded on-demand
- **Database Indexes**: 
  - `clients(organization_id, is_active)`
  - `pickups(pickup_date, organization_id)`
  - `locations(client_id, is_active)`
  - `assignments(scheduled_date, vehicle_id)`

## Authentication & Security

### Multi-tenant Architecture

- **Organization Isolation**: All data scoped by `organization_id`
- **Row Level Security**: Postgres RLS policies enforce data access
- **Demo Mode**: `DISABLE_AUTH` flag for testing without authentication
- **Role-based Access**: Admin, Manager, Driver roles with different permissions

### Security Measures

- **SQL Injection**: Prevented by Supabase client parameterized queries
- **XSS Protection**: React's built-in escaping + CSP headers
- **CSRF**: SameSite cookies + CSRF tokens for sensitive operations
- **Rate Limiting**: Edge function throttling + Supabase built-in limits

## Data Model Relationships

### Core Entities

```
Organizations (1) -> (*) Users
Organizations (1) -> (*) Clients
Clients (1) -> (*) Locations
Locations (1) -> (*) Pickups
Pickups (1) -> (*) Assignments
Vehicles (1) -> (*) Assignments
```

### Pricing Hierarchy

1. **Location-specific**: `locations.pricing_tier_id`
2. **Client default**: `clients.pricing_tier_id`
3. **Organization default**: `organizations.default_*_rate`

### Revenue Calculation

Computed in `calculate_pickup_revenue()` function:
- PTE Count × PTE Rate
- OTR Count × OTR Rate  
- Tractor Count × Tractor Rate
- Updates `clients.lifetime_revenue` on pickup completion

## Error Handling Strategy

### Frontend Error Boundary

- **Component Errors**: React Error Boundary catches render errors
- **Async Errors**: TanStack Query handles network failures
- **User Feedback**: Toast notifications for operation results
- **Retry Logic**: Automatic retry with exponential backoff

### Backend Error Handling

- **Edge Functions**: Try-catch blocks with structured error responses
- **Database**: Transaction rollbacks on constraint violations
- **External APIs**: Graceful degradation when services unavailable
- **Logging**: Console logs in development, external service in production

## Deployment Considerations

### Environment Variables

Required for full functionality:
- `GOOGLE_MAPS_API_KEY`: For geocoding and address autocomplete
- `SUPABASE_URL`: Database connection
- `SUPABASE_ANON_KEY`: Public API access

### Database Migrations

- **Version Control**: All schema changes in `supabase/migrations/`
- **Rollback Strategy**: Each migration includes reverse operations
- **Seed Data**: Default organization, pricing tiers, and test data

### Monitoring

- **Performance**: Core Web Vitals tracking
- **Errors**: Error boundary captures and logging
- **Usage**: Supabase analytics for API usage
- **Uptime**: Health check endpoints for monitoring services