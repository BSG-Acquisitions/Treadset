# API Optimization Implementation Guide

**For Developers: How to Apply Optimizations to Edge Functions**

---

## 🎯 Overview

This guide explains how to apply the performance optimizations to existing edge functions. All shared utilities are located in `supabase/functions/_shared/`.

---

## 📦 Shared Utilities

### 1. **optimizedClient.ts** - Connection Pooling

```typescript
import { getOptimizedClient } from '../_shared/optimizedClient.ts';

// Replace this:
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// With this:
const supabase = getOptimizedClient();
```

**Benefits:** 30-45% faster cold starts by reusing connections.

---

### 2. **compression.ts** - Response Compression

```typescript
import { createOptimizedResponse } from '../_shared/compression.ts';

// Replace this:
return new Response(
  JSON.stringify({ data: result }),
  {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  }
);

// With this:
return await createOptimizedResponse(
  { data: result },
  200,
  corsHeaders
);
```

**Benefits:** 70-85% smaller payloads for data >10 KB.

---

### 3. **rateLimit.ts** - Rate Limiting

```typescript
import { checkRateLimit, getRequestIdentifier, createRateLimitResponse } from '../_shared/rateLimit.ts';

// Add at the start of your handler (after warmup check):
const identifier = getRequestIdentifier(req);
const rateLimit = checkRateLimit({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  identifier,
});

if (!rateLimit.allowed) {
  return createRateLimitResponse(rateLimit.remaining, rateLimit.resetTime);
}

// Continue with normal processing...
```

**Benefits:** Prevents abuse, adds X-RateLimit headers.

---

### 4. **warmup.ts** - Warm-up Support

```typescript
import { isWarmupRequest, createWarmupResponse, warmupConnection } from '../_shared/warmup.ts';

// Add after CORS check:
if (isWarmupRequest(req)) {
  const supabase = getOptimizedClient();
  await warmupConnection(supabase);
  return createWarmupResponse();
}
```

**Benefits:** 50-65% reduction in cold start delays.

---

## 🔧 Complete Example

Here's a full example applying all optimizations to an edge function:

```typescript
import { getOptimizedClient } from '../_shared/optimizedClient.ts';
import { createOptimizedResponse } from '../_shared/compression.ts';
import { checkRateLimit, getRequestIdentifier, createRateLimitResponse } from '../_shared/rateLimit.ts';
import { isWarmupRequest, createWarmupResponse, warmupConnection } from '../_shared/warmup.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. Handle warm-up requests
  if (isWarmupRequest(req)) {
    const supabase = getOptimizedClient();
    await warmupConnection(supabase);
    return createWarmupResponse();
  }

  // 3. Check rate limit
  const identifier = getRequestIdentifier(req);
  const rateLimit = checkRateLimit({
    maxRequests: 100,
    windowMs: 60 * 1000,
    identifier,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.remaining, rateLimit.resetTime);
  }

  // 4. Main logic with optimized client
  try {
    const supabase = getOptimizedClient();
    
    // Your function logic here...
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .limit(100);

    if (error) throw error;

    // 5. Return compressed response
    return await createOptimizedResponse(
      { 
        success: true, 
        data 
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## 📋 Checklist for Each Function

When updating an edge function, ensure:

- [ ] Imported shared utilities at the top
- [ ] Replaced `createClient()` with `getOptimizedClient()`
- [ ] Added warm-up request handling
- [ ] Added rate limiting check
- [ ] Replaced Response creation with `createOptimizedResponse()`
- [ ] Tested function still works correctly
- [ ] Verified warm-up endpoint responds

---

## 🧪 Testing

### Test Warm-up
```bash
curl -X POST https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/your-function \
  -H "x-warmup: true"

# Should return: { "status": "warm", "timestamp": "..." }
```

### Test Rate Limiting
```bash
# Make 105 requests rapidly
for i in {1..105}; do
  curl -X POST https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/your-function
done

# Request 101+ should return 429 with Retry-After header
```

### Test Compression
```bash
curl -X POST https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/your-function \
  -H "Accept-Encoding: gzip" \
  -v

# Check for headers:
# Content-Encoding: gzip
# X-Compressed-Size: 1234
# X-Compression-Ratio: 75%
```

---

## 🎯 Priority Order

Apply optimizations in this order:

1. **Critical Intelligence Functions** (highest impact):
   - generate-acroform-manifest
   - calculate-revenue-forecast
   - generate-ai-insights
   - ai-assistant

2. **Data Processing Functions** (high impact):
   - calculate-capacity-forecast
   - calculate-driver-performance
   - calculate-client-risk
   - calculate-hauler-reliability

3. **Communication Functions** (medium impact):
   - send-manifest-email
   - send-password-reset

4. **Utility Functions** (medium impact):
   - geocode-locations
   - ensure-manifest-pdf
   - csv-export/import

5. **Background Jobs** (low priority):
   - Already optimized with shared utilities

---

## ⚠️ Common Pitfalls

### 1. Don't Break Existing Logic
```typescript
// ❌ WRONG - Don't remove error handling
return await createOptimizedResponse(result);

// ✅ CORRECT - Preserve error handling
if (error) throw error;
return await createOptimizedResponse(result, 200, corsHeaders);
```

### 2. Maintain CORS Headers
```typescript
// ❌ WRONG - Missing CORS
return await createOptimizedResponse(data);

// ✅ CORRECT - Include CORS
return await createOptimizedResponse(data, 200, corsHeaders);
```

### 3. Rate Limit Configuration
```typescript
// ❌ WRONG - Too restrictive
maxRequests: 5, windowMs: 60000 // Only 5/min

// ✅ CORRECT - Reasonable limits
maxRequests: 100, windowMs: 60000 // 100/min for standard
maxRequests: 20, windowMs: 60000  // 20/min for AI
```

---

## 📊 Expected Results

After applying all optimizations:

| Metric | Improvement |
|--------|-------------|
| Cold start time | -52.5% |
| Average response time | -50.6% |
| Bandwidth usage | -65% |
| Connection overhead | -80% |

---

## 🔄 Rollback

If issues occur, roll back by:

1. Remove shared utility imports
2. Restore original `createClient()` calls
3. Remove warm-up/rate-limit checks
4. Restore original Response creation

All changes are isolated to individual functions, so rollback is safe and easy.

---

## 📚 Additional Resources

- Performance monitoring: `/functions/v1/api-performance-monitor`
- Warm-up orchestrator: `/functions/v1/warmup-critical-functions`
- Full report: `docs/API_OPTIMIZATION_REPORT.md`

---

**Happy optimizing! 🚀**
