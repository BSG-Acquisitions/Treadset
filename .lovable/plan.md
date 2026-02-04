
# Fix Outbound Schedule Labeling, Password Reset Emails, and Driver Access

## Issues Identified

### Issue 1: "Outbound Schedule" Label Truncation
The navigation displays "Outbound Schedule" which is being cut off on smaller screens. The user wants it shortened to just "Outbound" for better display.

**Affected Files:**
- `src/pages/OutboundSchedule.tsx` (line 86, 212) - Page title and header
- `src/components/TopNav.tsx` (line 217) - Navigation dropdown menu
- `src/components/AppSidebar.tsx` (lines 84, 135) - Sidebar navigation

### Issue 2: Password Reset Email Not Branded
When users (like Jody) request a password reset, they're being directed to the Lovable website instead of the TreadSet branded experience. This is a critical UX issue.

**Root Cause Analysis:**

Looking at `src/contexts/AuthContext.tsx` lines 421-456:
```typescript
const resetPassword = async (email: string) => {
  const currentUrl = window.location.origin;  // ← Problem!
  const resetUrl = `${currentUrl}/reset-password`;
```

The issue is that `window.location.origin` returns different URLs depending on where the reset is triggered from:
- **Production**: `https://treadset.lovable.app` ✅ Correct
- **Preview/Editor**: `https://id-preview--9afe9a8a-...lovable.app` ❌ Wrong (editor URL)
- **Localhost**: `http://localhost:5173` ❌ Wrong (dev URL)

The existing memory states that the production URL should be hardcoded:
> **Memory: constraints/auth-email-production-url** - To prevent broken authentication links when triggered from Lovable preview environments, the 'AuthContext.tsx' must hardcode the production URL (e.g., https://treadset.lovable.app) for redirect targets.

**Current Implementation:**
The code uses Supabase's built-in `resetPasswordForEmail()` which is correct (per memory: auth/password-reset-hybrid-flow), but the `redirectTo` URL is dynamic based on `window.location.origin`.

**Impact:**
- Emails sent from preview environments contain preview URLs
- Users clicking reset links are taken to Lovable editor login instead of TreadSet

### Issue 3: Driver Access for Jody
The user needs to know what role to assign Jody so he can log in and use the system, specifically for outbound deliveries.

**Access Requirements Analysis:**

From the codebase investigation:

1. **Outbound Schedule Page Access** (`src/App.tsx` line 328-334):
   ```typescript
   <Route path="/outbound-schedule" element={
     <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
   ```
   Requires: `admin`, `ops_manager`, or `dispatcher`

2. **Driver Outbound Creation** (`src/App.tsx` line 314-320):
   ```typescript
   <Route path="/driver/outbound/new" element={
     <ProtectedRoute roles={['driver', 'admin']}>
   ```
   Requires: `driver` or `admin`

3. **Outbound Hauler Capability** (`src/hooks/useDriverCapabilities.ts` lines 69-75):
   ```typescript
   export const useHasOutboundHaulerCapability = () => {
     const { data: capabilities, isLoading } = useCurrentUserCapabilities();
     const hasOutboundHauler = capabilities?.some(c => c.capability === 'outbound_hauler') ?? false;
     return { hasOutboundHauler, isLoading };
   };
   ```

**Access Flow for Drivers:**
- **Role**: `driver` (in `user_organization_roles` table)
- **Capability**: `outbound_hauler` (in `driver_capabilities` table)

The `driver` role gives access to driver routes, but the `outbound_hauler` **capability** specifically grants permission to create outbound manifests (per memory: features/outbound-manifest-three-signature-workflow).

**Where to Grant Capabilities:**
From `src/pages/TrailerDriverManagement.tsx`, there's a UI for managing driver capabilities including `outbound_hauler` using the `useGrantCapability` hook.

---

## Implementation Plan

### Phase 1: Shorten "Outbound Schedule" to "Outbound"

**Files to Update:**

1. **`src/pages/OutboundSchedule.tsx`**
   - Line 86: `document.title = "Outbound – TreadSet";`
   - Line 212: `title="Outbound"`

2. **`src/components/TopNav.tsx`**
   - Line 217: `Outbound Schedule` → `Outbound`

3. **`src/components/AppSidebar.tsx`**
   - Line 84: `label: 'Outbound Schedule'` → `label: 'Outbound'`
   - Line 135: `label: 'Outbound Schedule'` → `label: 'Outbound'`

---

### Phase 2: Fix Password Reset Email URL

**File: `src/contexts/AuthContext.tsx`**

**Current Code (lines 421-424):**
```typescript
const resetPassword = async (email: string) => {
  const currentUrl = window.location.origin;
  const resetUrl = `${currentUrl}/reset-password`;
```

**Updated Code:**
```typescript
const resetPassword = async (email: string) => {
  // Hardcode production URL to prevent preview/dev environment issues
  const productionUrl = 'https://treadset.lovable.app';
  const resetUrl = `${productionUrl}/reset-password`;
```

**Why This Works:**
- Password reset emails will always contain `https://treadset.lovable.app/reset-password`
- Users clicking the link are taken to the branded production site
- Works correctly even when triggered from preview environments
- Follows existing memory constraint: `auth-email-production-url`

**Note:** The `signUp` function on line 384 also uses `window.location.origin` but this is acceptable for signup flows as users typically register on the production site, not preview.

---

### Phase 3: Document Driver Access Requirements

**No Code Changes Required** - This is documentation/user guidance.

To grant Jody access to the outbound delivery system:

1. **Assign Driver Role:**
   - Go to `/employees` page
   - Find Jody in the employee list
   - Click the Settings icon to edit
   - In the "Roles" section, check the **"Driver"** checkbox
   - Click "Update Employee"

2. **Grant Outbound Hauler Capability:**
   - Go to `/trailers/drivers` (Trailers → Driver Management)
   - Find Jody in the driver list
   - Click "Grant Capability"
   - Select **"outbound_hauler"** from the dropdown
   - Confirm

**Access Granted:**
- Jody can log in at `https://treadset.lovable.app/auth/sign-in`
- He'll see the Driver Dashboard (`/driver/dashboard`)
- He can create outbound manifests (`/driver/outbound/new`)
- He can view his assigned outbound deliveries on the dashboard

**If Jody Can't Log In:**
After assigning the role, use the "Reset Password" button in the Edit Employee dialog to send him a password reset email. The email will now correctly point to `https://treadset.lovable.app/reset-password` (after Phase 2 fix).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/OutboundSchedule.tsx` | Change "Outbound Schedule" → "Outbound" (2 locations) |
| `src/components/TopNav.tsx` | Change "Outbound Schedule" → "Outbound" (1 location) |
| `src/components/AppSidebar.tsx` | Change "Outbound Schedule" → "Outbound" (2 locations) |
| `src/contexts/AuthContext.tsx` | Hardcode production URL for password reset redirects |

---

## Expected Results

| Issue | Before | After |
|-------|--------|-------|
| Navigation label | "Outbound Schedule" (truncated on mobile) | "Outbound" (fits on all screens) |
| Password reset email | Links to preview URLs (broken) | Links to `treadset.lovable.app` (works) |
| Jody's access | Can't log in or use outbound | Can log in, create outbound manifests |

---

## Technical Notes

### Password Reset Flow

Per memory `auth/password-reset-hybrid-flow`, the current implementation correctly uses:
1. **Supabase's built-in `resetPasswordForEmail()`** - Generates secure token
2. **Custom Resend edge function** - Sends branded email (optional/backup)

The only fix needed is ensuring the `redirectTo` URL is always the production domain.

### Why Not Use Environment Variables?

The `VITE_*` pattern is not supported in Lovable (per limitations in useful context). Hardcoding the production URL is the recommended pattern for this use case.

### Driver Capabilities vs Roles

- **Roles** (`user_organization_roles` table): Broad access levels (admin, driver, etc.)
- **Capabilities** (`driver_capabilities` table): Granular permissions (semi_hauler, outbound_hauler)

Jody needs both:
- `driver` role → Access to driver routes and dashboard
- `outbound_hauler` capability → Permission to create outbound manifests

### Email Template Branding

Password reset email templates are managed in Supabase Dashboard under Authentication > Email Templates (per memory `auth/password-reset-hybrid-flow`). The custom Resend function provides additional branding but relies on Supabase's token generation.

---

## User Action Required After Implementation

1. **Verify Password Reset:**
   - Test password reset from `/auth/sign-in`
   - Confirm email contains `https://treadset.lovable.app/reset-password` link
   - Verify link redirects correctly (not to Lovable)

2. **Grant Jody Access:**
   - Go to `/employees` → Edit Jody → Check "Driver" role
   - Go to `/trailers/drivers` → Grant "outbound_hauler" capability
   - Send password reset email to Jody
   - Confirm he can log in and access outbound features
