

# Fix "Find Nearby Shops" - No Results Bug

## Problem Identified

The "Find Nearby Shops" feature returns "No nearby clients found within 5 miles" even though your database clearly shows **20+ clients** within that radius.

**Root cause**: The `suggest-nearby-clients` edge function has a bug where client IDs are not passed to the AI, so the AI can't return valid IDs back.

### How the Bug Works

1. The function finds ~20 nearby clients (this part works correctly)
2. It sends a prompt to the AI with client names and addresses **but NOT client_ids**
3. The AI is asked to return suggestions with `client_id` field
4. The AI makes up IDs (or returns empty strings) because it doesn't know the real IDs
5. The enrichment step tries to match AI's `client_id` against real clients: `nearbyClients.find(c => c.id === suggestion.client_id)`
6. None match, so all suggestions get filtered out
7. Result: empty array returned

### Evidence

- Database query shows 197 out of 207 clients have geocoded coordinates
- Direct SQL query finds 20+ clients within 5 miles of One Stop Tire
- Edge function logs show no errors (it's silently returning empty results)
- The AI prompt at line 159-163 never includes the client `id` field

---

## Solution

Update the `suggest-nearby-clients` edge function to include client IDs in the prompt so the AI can return them correctly.

### Changes to `supabase/functions/suggest-nearby-clients/index.ts`

**Line 159-163 - Add client_id to the prompt:**

```typescript
// BEFORE (broken):
${nearbyClients.map(c => `
- ${c.company_name} (${c.distance.toFixed(1)} miles away)
  Location: ${c.location?.address || 'Address not available'}
  Last pickup: ${c.last_pickup_at ? new Date(c.last_pickup_at).toLocaleDateString() : 'Never'}
`).join('\n')}

// AFTER (fixed):
${nearbyClients.map(c => `
- ID: ${c.id} | ${c.company_name} (${c.distance.toFixed(1)} miles away)
  Location: ${c.location?.address || 'Address not available'}
  Last pickup: ${c.last_pickup_at ? new Date(c.last_pickup_at).toLocaleDateString() : 'Never'}
`).join('\n')}
```

**Update system prompt to instruct AI to use exact IDs:**

Add to the system prompt: "When returning suggestions, use the exact client ID provided (the UUID after 'ID:'). Do not modify or abbreviate the IDs."

### Additional Safety: Fallback Enhancement

If the AI still fails, the fallback (lines 211-224) should be returned. But currently, the fallback only triggers on HTTP errors (line 208), not on empty AI results. Add a fallback for when the AI returns no valid suggestions.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/suggest-nearby-clients/index.ts` | Add client_id to AI prompt, improve fallback logic |

---

## Verification After Fix

1. The edge function will include IDs in the prompt: `ID: 00382bf1-88f4-4755-8797-6c391d240380 | 247 Tire Repair...`
2. The AI will return valid IDs in its response
3. The enrichment step will find matching clients
4. Driver will see nearby shop suggestions

---

## Optional Enhancement

Also wire up the new `driver-route-suggestions` edge function (which was created earlier but not connected) to the "Find Nearby Shops" button. This function considers ALL scheduled stops, not just the first one, providing better route-wide suggestions.

