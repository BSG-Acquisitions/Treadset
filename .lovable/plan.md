

# Remove Year from Client Analytics Header

## Change Required

**File:** `src/pages/ClientAnalytics.tsx`  
**Line:** 24

| Current Text | New Text |
|--------------|----------|
| "Comprehensive insights into your **2025** tire recycling operations and client performance" | "Comprehensive insights into your tire recycling operations and client performance" |

## Implementation

Simply remove "2025 " from the subtitle text on line 24.

```typescript
// Before:
Comprehensive insights into your 2025 tire recycling operations and client performance

// After:
Comprehensive insights into your tire recycling operations and client performance
```

This keeps the header clean and evergreen without needing annual updates.

