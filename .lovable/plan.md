
# Plan: Fix Demo Mode Organization Context

## Problem
The demo user (`demo@treadset.com`) is logged in but seeing no data because:
1. The AuthContext reads org slug from a cookie (defaults to `bsg`)
2. The demo user only has access to org slug `demo` (TreadSet Demo)
3. When no matching org is found, it falls back to hardcoded BSG org ID
4. All dashboard queries use `user?.currentOrganization?.id` which points to BSG instead of demo org

## Solution
Modify the AuthContext to intelligently fall back to the user's first available organization when the cookie-stored org slug doesn't match any of their organizations.

## Implementation Details

### File: `src/contexts/AuthContext.tsx`

**Change 1: Update the fallback logic in `loadUserData` function (around lines 203-225)**

Current behavior:
```typescript
// Find current organization by cookie slug
const currentOrg = userData.user_organization_roles?.find(
  (uor: any) => uor.organization?.slug === orgSlug
)?.organization;

// Falls back to hardcoded BSG if not found
currentOrganization: currentOrg || {
  id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
  name: 'BSG Logistics',
  slug: 'bsg'
}
```

New behavior:
```typescript
// Find current organization by cookie slug
let currentOrg = userData.user_organization_roles?.find(
  (uor: any) => uor.organization?.slug === orgSlug
)?.organization;

// If cookie slug doesn't match, use user's first available org
if (!currentOrg && userData.user_organization_roles?.length > 0) {
  currentOrg = userData.user_organization_roles[0]?.organization;
  console.log('No matching org for cookie slug, using first available:', currentOrg?.slug);
}

// Use user's actual org, only fall back to BSG if truly no orgs
currentOrganization: currentOrg || {
  id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
  name: 'BSG Logistics',
  slug: 'bsg'
}
```

**Change 2: Update the role extraction to match**

Current:
```typescript
const roles = userData.user_organization_roles?.
  filter((uor: any) => uor.organization?.slug === orgSlug)
  .map((uor: any) => uor.role) || ['admin'];
```

New:
```typescript
// Get roles for the current organization
const roles = userData.user_organization_roles?.
  filter((uor: any) => uor.organization?.id === currentOrg?.id)
  .map((uor: any) => uor.role) || ['admin'];
```

## Expected Result
After this change:
- Demo user logs in with `demo@treadset.com`
- AuthContext detects no org matching cookie slug `bsg`
- Falls back to user's first organization: **TreadSet Demo** (`de300000-0000-4000-8000-000000000001`)
- Dashboard queries use correct org ID
- Demo data (12 clients, 10 pickups, 7 manifests) appears on dashboard

## Additional Consideration
The demo user currently has the `viewer` role which may restrict some actions - this is intentional for marketing demos to prevent accidental data modification.

## Testing
1. Log out and log back in as `demo@treadset.com`
2. Dashboard should show demo organization data
3. Verify "TreadSet Demo" appears in org name display
4. Confirm all dashboard tiles show demo data
