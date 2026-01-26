

# Access Code Demo Mode

## Overview
Create a public demo experience where prospects can enter an access code (e.g., "DEMO2025") to view a read-only dashboard with sample data - no account creation required.

## How It Will Work

1. **Prospect visits** `/demo` or clicks "See Demo" on the marketing site
2. **Code entry screen** asks for the access code
3. **On valid code**, they see the full dashboard with sample data
4. **All write operations blocked** - buttons show "Demo Mode" toast
5. **Session stored in browser** (localStorage) - expires after configured time

```text
┌─────────────────────────────────────────────────────┐
│                    /demo                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│         [TreadSet Logo]                             │
│                                                     │
│     Enter Demo Access Code                          │
│     ┌─────────────────────────────────┐            │
│     │  DEMO2025                       │            │
│     └─────────────────────────────────┘            │
│                                                     │
│           [ Access Demo ]                           │
│                                                     │
│     Need access? Contact sales@treadset.com        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create Demo Access Context
Create `src/contexts/DemoAccessContext.tsx` to manage demo session state:
- Check localStorage for valid demo token
- Validate access code against allowed codes
- Provide `isDemoAccess` flag to child components
- Store demo session with expiration (e.g., 24 hours)

### Step 2: Create Demo Entry Page
Create `src/pages/DemoAccess.tsx`:
- Simple form with code input field
- Validates code and stores session in localStorage
- Redirects to `/demo/dashboard` on success
- Shows error for invalid codes

### Step 3: Create Demo Dashboard Wrapper
Create `src/pages/DemoDashboard.tsx`:
- Reuses the existing `Index.tsx` dashboard component
- Wraps it with demo context that:
  - Sets `isDemoMode = true` automatically
  - Uses hardcoded demo organization ID
  - Shows "Demo Mode" badge in header
  - Blocks all write operations

### Step 4: Add Demo Routes
Update `src/App.tsx` to add public demo routes:
```
/demo          → DemoAccess (code entry)
/demo/dashboard → DemoDashboard (read-only view)
```

### Step 5: Create Demo Data Hook
Create `src/hooks/useDemoData.ts`:
- Fetches data from the "TreadSet Demo" organization (already seeded)
- Uses a service role or public access pattern
- Returns same data shape as production hooks

### Step 6: Update Write Guards
Modify `src/hooks/useCanWrite.ts` to also check for demo access mode:
- If `isDemoAccess` from context is true → return false
- Existing `viewer` role check still works for logged-in demos

### Step 7: Add Access Code Management
Store allowed codes in environment or database:
- Option A: Edge function validates code server-side (more secure)
- Option B: Client-side validation against a hash (simpler)

Recommend Option A for production use.

---

## Technical Details

### Demo Session Storage
```typescript
interface DemoSession {
  validUntil: number; // Unix timestamp
  accessedAt: number;
}

// Stored in localStorage as:
localStorage.setItem('treadset_demo', JSON.stringify(session));
```

### Access Code Validation (Edge Function)
```typescript
// POST /demo-validate
// Body: { code: "DEMO2025" }
// Response: { valid: true, expiresIn: 86400 } or { valid: false }
```

### Data Access Pattern
Since RLS requires authentication, the demo will:
1. Query a special public view or
2. Use an edge function that returns demo org data
3. Or fetch via a service role in the edge function

Recommend approach #2 (edge function) for security.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/contexts/DemoAccessContext.tsx` | Create - manages demo session |
| `src/pages/DemoAccess.tsx` | Create - code entry page |
| `src/pages/DemoDashboard.tsx` | Create - wrapper for demo view |
| `src/App.tsx` | Modify - add /demo routes |
| `src/hooks/useCanWrite.ts` | Modify - check demo access flag |
| `supabase/functions/demo-validate/index.ts` | Create - validates access codes |
| `supabase/functions/demo-data/index.ts` | Create - returns demo org data |

---

## Security Considerations

- Access codes should be rotated periodically
- Demo data is completely isolated from production via organization_id
- No authentication tokens are created - just localStorage session
- Edge function uses service role only for demo org data
- Write operations are blocked at the UI level AND validated server-side

---

## Configuration

The access code(s) will be stored as a Supabase edge function secret:
```
DEMO_ACCESS_CODES=DEMO2025,TREADSET2025
```

This allows you to:
- Have multiple codes for different events/prospects
- Rotate codes without code deployment
- Track which codes are used (optional logging)

