# Geocoding Solution - Detroit Metro Area

## Overview
This document explains the hardened geocoding implementation for Detroit-area addresses with confidence scoring and validation.

## Core Features

### 1. **Geographic Boundaries**
- **Detroit Metro Bounds**: Covers Wayne, Oakland, and Macomb counties
  - Latitude: 42.1° to 42.8°N
  - Longitude: -83.6° to -82.4°W
- **Max Distance from Depot**: 100 miles (160 km)

### 2. **Address Enhancement**
Addresses are automatically enhanced before geocoding:
```
"10401 Mack Ave" → "10401 Mack Ave, Detroit, MI"
```

Enhancement rules:
- Uses client city/state if available in database
- Defaults to "Detroit, MI" for addresses without city/state
- Preserves addresses that already include complete location info

### 3. **Multi-Layer Validation**

#### Result Type Filtering
✅ **Accepted types**:
- `street_address` - Full street address
- `premise` - Building/property
- `establishment` - Business location
- `subpremise` - Suite/unit within building
- `point_of_interest` - Landmark

❌ **Rejected types**:
- `administrative_area_level_1` (state-level)
- `country` (country-level)
- Other coarse location types

#### Geographic Validation
- Coordinates must fall within Detroit metro bounds OR
- Be in Wayne/Oakland/Macomb County OR
- Have very high precision score (>70%)

#### Distance Validation
- Final check: Must be within 100 miles of organization's depot
- Rejects results that are clearly incorrect (e.g., addresses in other states)

### 4. **Confidence Scoring**

Score calculation (0-100%):
- **+40 points**: Street-level precision
- **+30 points**: Within Detroit geographic bounds
- **+30 points**: Within Detroit metro county

**Interpretation**:
- **80-100%**: ✅ High confidence - safe to use
- **60-79%**: ⚠️  Medium confidence - verify if critical
- **0-59%**: ❌ Low confidence - manual review recommended

### 5. **Fallback Strategy**

For each address, tries in order:
1. Enhanced address with strict MI filtering + bounds
2. Original address with strict MI filtering + bounds
3. Business name + "Detroit, MI" with bounds

Stops at first successful geocode that passes validation.

## Usage

### Single Location Geocode
```javascript
const result = await supabase.functions.invoke('geocode-locations', {
  body: {
    locationId: 'uuid-here',
    forceUpdate: false  // Set true to re-geocode existing coordinates
  }
});
```

### Batch Geocode All Locations
```javascript
const result = await supabase.functions.invoke('geocode-locations', {
  body: {
    fixOutliers: true,  // Only re-geocode outliers (>100mi from depot)
    forceUpdate: false  // Set true to re-geocode ALL locations
  }
});
```

## Response Format

### Single Location
```json
{
  "message": "Location coordinates updated successfully",
  "location": {
    "id": "uuid",
    "name": "Hood's Tire Service",
    "latitude": 42.3812,
    "longitude": -82.9456,
    "county": "Wayne",
    "confidence": 90,
    "distanceFromDepotMiles": "3.2",
    "confidenceLevel": "✅ High confidence"
  }
}
```

### Batch Mode
```json
{
  "message": "Geocoding completed: 45 successful, 2 failed, 10 skipped",
  "successful": 45,
  "failed": 2,
  "skipped": 10,
  "outliersCorrected": 3,
  "lowConfidence": 1,
  "locations": [...]
}
```

## Common Issues Resolved

### ❌ Before
- "10401 Mack Ave" geocoded to New York
- Ambiguous addresses matched first result regardless of location
- No validation of results

### ✅ After
- Addresses default to Detroit context
- Results validated against Detroit metro bounds
- County verification ensures correct state
- Distance check prevents obviously wrong coordinates
- Confidence scoring flags uncertain results

## Best Practices

1. **Run Initial Geocode**: Use batch mode to geocode all locations
2. **Review Low Confidence**: Check locations with <70% confidence manually
3. **Fix Outliers**: Use `fixOutliers: true` to re-geocode suspicious coordinates
4. **Monitor Distance**: Check `distanceFromDepotMiles` for sanity
5. **Verify County**: Wayne/Oakland/Macomb are expected for Detroit metro

## Example Output

```
🔍 Enhanced: "10401 Mack Ave" -> "10401 Mack Ave, Detroit, MI"
📍 Geocoded: 10401 Mack Ave, Detroit, MI -> (42.3812, -82.9456)
   County: Wayne, In bounds: true, Confidence: 90%
✅ Corrected outlier: was 523km, now 5km from depot
```

## Why This Works

1. **Bounding Box**: Restricts Google Maps API search area to Michigan
2. **Components Filter**: Only returns results from Michigan
3. **Type Filtering**: Rejects vague/coarse results
4. **Distance Validation**: Final sanity check prevents obviously wrong coordinates
5. **Address Enhancement**: Provides context to disambiguate addresses
6. **Confidence Scoring**: Transparent about result quality

This is **production-grade** logistics geocoding that:
- Handles ambiguous addresses correctly
- Validates results against business logic
- Provides quality metrics
- Prevents data corruption from bad geocodes
