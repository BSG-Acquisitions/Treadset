

# Domain-Based Routing Implementation

## Overview

Add domain detection logic to show different content based on where users access the app:
- **BSG domains** (bsgtires.com, www.bsgtires.com) → BSG Marketing Site
- **TreadSet domains** (treadset.lovable.app, app.treadset.com, localhost) → TreadSet App Landing

---

## Files to Create

### 1. `src/pages/AppLanding.tsx` - TreadSet SaaS Landing Page

A clean, professional landing page for TreadSet app access:

**Content:**
- TreadSet logo (using existing `TreadSetLogo` component)
- Headline: "Tire Logistics, Simplified"
- Subtext: "The complete platform for tire recycling operations"
- Two CTA buttons:
  - **Primary:** "Sign In" → links to `/auth`
  - **Secondary:** "Request a Demo" → links to `/contact` or external form
- Feature highlights (3 bullet points):
  - Real-time route optimization
  - Digital manifests & compliance
  - Complete business analytics
- Footer: "Powered by TreadSet" with copyright

**Styling:**
- Matches Auth.tsx aesthetic (clean, centered, professional)
- Uses existing Tailwind classes and shadcn components
- Subtle animations with Framer Motion
- Dark/light mode compatible

---

## Files to Modify

### 2. `src/App.tsx` - Add Domain Routing Logic

**Changes:**
1. Create a `RootRoute` component that detects the hostname
2. Replace the static `<PublicLanding />` route with conditional rendering

**Logic:**
```text
hostname detection:
├── Contains "bsg" or "bsgtires" → <PublicLanding /> (BSG Marketing)
├── Contains "treadset" or "lovable" or "localhost" → <AppLanding /> (TreadSet App)
└── Default fallback → <AppLanding /> (TreadSet App)
```

**Code structure:**
```typescript
function RootRoute() {
  const hostname = window.location.hostname;
  
  // BSG-specific domains show BSG marketing
  if (hostname.includes('bsg') || hostname.includes('bsgtires')) {
    return <PublicLanding />;
  }
  
  // All other domains (treadset, lovable, localhost) show app landing
  return <AppLanding />;
}
```

---

## Technical Details

### Domain Mapping After Implementation

| Domain | Component Rendered | Content |
|--------|-------------------|---------|
| bsgtires.com | `<PublicLanding />` | BSG marketing site with truck images, tire counter |
| www.bsgtires.com | `<PublicLanding />` | BSG marketing site |
| treadset.lovable.app | `<AppLanding />` | Clean TreadSet login/demo page |
| app.treadset.com | `<AppLanding />` | Clean TreadSet login/demo page |
| localhost:8080 | `<AppLanding />` | Clean TreadSet login/demo page (for development) |

### Component Structure

```text
src/pages/
├── AppLanding.tsx          (NEW - TreadSet SaaS landing)
├── PublicLanding.tsx       (UNCHANGED - BSG marketing)
└── Auth.tsx                (UNCHANGED - login/signup)

src/App.tsx
└── RootRoute component     (NEW - domain detection)
    ├── → PublicLanding     (if BSG domain)
    └── → AppLanding        (if TreadSet domain)
```

### AppLanding.tsx Design

```text
┌─────────────────────────────────────────┐
│                                         │
│          [TreadSet Logo]                │
│                                         │
│     Tire Logistics, Simplified          │
│                                         │
│  The complete platform for tire         │
│  recycling operations management        │
│                                         │
│  ┌─────────────┐  ┌──────────────┐     │
│  │   Sign In   │  │ Request Demo │     │
│  └─────────────┘  └──────────────┘     │
│                                         │
│  ✓ Real-time route optimization         │
│  ✓ Digital manifests & compliance       │
│  ✓ Complete business analytics          │
│                                         │
│         © 2025 TreadSet                 │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

1. **Create `src/pages/AppLanding.tsx`**
   - Import TreadSetLogo, Button, framer-motion
   - Build clean SaaS landing with Sign In + Demo CTAs
   - Style to match existing Auth.tsx aesthetic

2. **Update `src/App.tsx`**
   - Add import for AppLanding
   - Create RootRoute component with hostname detection
   - Replace `<Route path="/" element={<PublicLanding />} />` with `<Route path="/" element={<RootRoute />} />`

3. **Test locally**
   - Verify localhost shows AppLanding
   - App will show BSG content only when accessed via bsgtires.com

---

## No Database Changes Required

This is a frontend-only change. No migrations, RLS policies, or Supabase modifications needed.

