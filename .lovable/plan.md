

## Plan: Fix Client Address Corruption Chain

### What Happened

When you created Entech Inc. with address "10440 Co Rd 2, Middlebury, IN 46540", three things went wrong in sequence:

1. **Geocoder is Detroit-only**: The `geocode-locations` edge function has hardcoded Detroit metro bounds (lat 41.9–42.85, lng -84.0 to -82.4). It forced Entech's Indiana address to resolve to a Detroit location (42.40, -82.92) with 100% confidence — completely wrong.

2. **Backfill overwrote county**: The `backfill-client-geography` function reverse-geocoded those wrong coordinates and overwrote the client's `county` from "Elkhart" to "Wayne" (line 147 of the edge function).

3. **Wizard reads wrong fields**: The `TrailerRouteWizard` reads `physical_city`, `physical_state`, `physical_zip` (line 93/117) — which are the reverse-geocoded fields that now show "Detroit, MI, 48224" instead of the user-entered "Middlebury, IN, 46540".

### Fixes Required

#### 1. `TrailerRouteWizard.tsx` — Read user-entered address fields
Change the client search query (line 93) to select `mailing_address, city, state, zip` instead of `physical_address, physical_city, physical_state, physical_zip`. The mailing address fields contain what the user actually typed. The physical fields are for geocoded/reverse-geocoded data and should never be the primary display.

Also update line 117 to build the address from `mailing_address, city, state, zip`.

#### 2. `backfill-client-geography` edge function — Stop overwriting `county`
Line 147 overwrites the client's `county` with reverse-geocoded data. This should only write to `physical_*` fields, never touch user-entered fields. Remove `updates.county = geo.county` and add `updates.physical_county = geo.county` (or skip county entirely if there's no physical_county column).

#### 3. `backfill-client-geography` — Don't run on clients with existing city/state/zip
For single-client mode (lines 98–172), the function checks `physical_city`/`physical_zip` to decide whether to skip. But a newly created client has those empty, so it always runs. It should first check if the client already has `city` and `zip` in the main fields — if so, just copy those to `physical_*` fields instead of reverse-geocoding.

#### 4. `geocode-locations` edge function — Don't force Detroit bounds on out-of-area addresses
This is the root cause. The geocoder should detect when a location address includes a non-Michigan state and either skip geocoding or use unbounded geocoding. For now, the safest fix is: if the location's address contains a state abbreviation that isn't MI/Michigan, skip the Detroit bounds filtering.

### Files to Edit

| File | Change |
|------|--------|
| `src/components/trailers/TrailerRouteWizard.tsx` | Read `mailing_address, city, state, zip` instead of `physical_*` fields |
| `supabase/functions/backfill-client-geography/index.ts` | Stop overwriting `county`; for single-client, copy `city/state/zip` to `physical_*` before reverse-geocoding |
| `supabase/functions/geocode-locations/index.ts` | Skip Detroit-specific bounds when address contains a non-MI state |

### Immediate Data Fix
Also need to correct Entech Inc.'s data in the database — restore county to "Elkhart" and set physical fields to match the actual Indiana address.

