

## Root Cause

The walk-in drop-off with 6 PTEs was clicked "Generate Manifest" 4 times in rapid succession (within ~20 seconds). Each click created a new manifest record with 6 PTEs. The database now has:
- **1 dropoff** record (correct) with `manifest_id = NULL` (because `requires_manifest = false`)
- **4 manifest** records all pointing to the same dropoff via `dropoff_id`

The RPC `get_today_pte_totals` deduplicates by checking `NOT EXISTS (SELECT 1 FROM dropoffs WHERE manifest_id = manifests.id)`. But since the dropoff's `manifest_id` is null, none of the 4 manifests get excluded. Result: 4 × 6 = 24 extra PTEs → 484 instead of 460.

## Two bugs enabling this

**Bug 1: No idempotency in `useGenerateDropoffManifest`** — The hook blindly creates a new manifest every call. It never checks whether a manifest already exists for that `dropoff_id`.

**Bug 2: Insufficient button disabling** — The "Generate Manifest" button checks `generateManifest.isPending` (a shared boolean), but multiple rapid clicks can queue mutations before the first one completes and updates `dropoff.manifest_id`.

## Plan

### Step 1: Immediate data fix — delete the 3 duplicate manifests

Delete the 3 orphan manifests for this walk-in drop-off (keeping the earliest one), and optionally link it to the dropoff record. This immediately corrects the count from 484 → 460.

### Step 2: Add idempotency guard to `useGenerateDropoffManifest`

**File: `src/hooks/useGenerateDropoffManifest.ts`**

Before creating a new manifest, check if one already exists for this dropoff:
```typescript
// Check if manifest already exists for this dropoff
const { data: existingManifest } = await supabase
  .from('manifests')
  .select('id')
  .eq('dropoff_id', dropoffId)
  .limit(1)
  .maybeSingle();

if (existingManifest) {
  throw new Error('A manifest already exists for this drop-off');
}
```

### Step 3: Add per-dropoff mutation tracking to prevent rapid clicks

**File: `src/components/dropoffs/DropoffsList.tsx`**

Track which dropoff ID is currently generating a manifest:
- Add state: `const [generatingDropoffId, setGeneratingDropoffId] = useState<string | null>(null)`
- Disable the button per-row: `disabled={generatingDropoffId === dropoff.id || generateManifest.isPending}`
- Set/clear the ID around the mutation call

### Step 4: Add database-level unique constraint (defense in depth)

Add a unique index on `manifests.dropoff_id` (where not null) to prevent duplicate manifests at the database level, regardless of UI race conditions:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_manifests_unique_dropoff 
ON manifests(dropoff_id) WHERE dropoff_id IS NOT NULL;
```

This is the strongest protection — even if the UI fails, the database rejects duplicates.

### Technical details

**Files changed:**
- `src/hooks/useGenerateDropoffManifest.ts` — add existence check before insert (~5 lines)
- `src/components/dropoffs/DropoffsList.tsx` — add per-row disable tracking (~8 lines)
- Database migration — unique partial index on `manifests.dropoff_id`
- Data cleanup — delete 3 duplicate manifests

