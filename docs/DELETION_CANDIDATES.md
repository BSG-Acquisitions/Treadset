# Safe Deletion Candidates (A ∩ B Analysis)

## Methodology
Using the A ∩ B rule: Only delete items that are BOTH unused exports (List A) AND contain overlay references (List B).

## SAFE DELETE CANDIDATES

### ✅ Tier 1: Zero Risk Deletions

**File**: `supabase/functions/generate-manifest-pdf/index.ts`  
**Why Safe**: 
- Unused for 7 days (adapter logs show 0 overlay calls)
- Entire function dedicated to overlay system
- Has AcroForm replacement via `generate-acroform-manifest`
- Self-contained with no external dependencies

**File**: `config/manifestFields.json`  
**Why Safe**:
- Only consumed by generate-manifest-pdf function
- No other references in codebase
- Field mappings replaced by ManifestDomain mappers

**File**: `config/manifestLayout.json`  
**Why Safe**:
- Only consumed by generate-manifest-pdf function  
- PDF coordinate system replaced by AcroForm template
- No other references in codebase

**File**: `docs/MANIFEST_OVERLAY.md`  
**Why Safe**:
- Documentation for deleted system
- No functional impact
- Historical reference available in git

### ✅ Tier 2: Database Cleanup (Plan Only)

**Database Views**: `generator_overlay_view`, `hauler_overlay_view`, `receiver_overlay_view`  
**Why Safe**:
- Created specifically for overlay field mapping
- No usage detected in 7-day log analysis
- Replaced by addressResolver cascade logic

**Database Tables**: `pdf_calibrations`, `pdf_templates` (data cleanup)  
**Why Safe**:
- Contains overlay-specific calibration data
- Tables themselves may stay for future PDF engines
- Data cleanup only, not schema deletion

### ⚠️ Tier 3: Conditional Cleanup

**Dependency**: `pdf-lib@1.17.1`  
**Status**: KEEP for now  
**Reason**: Still used by `src/components/manifest/AcroFormLivePreview.tsx`  
**Future**: Consider removal after AcroForm preview alternative

### ❌ Explicitly NOT Deleting

**File**: `src/lib/pdf/generateManifestPDF.ts`  
**Reason**: Contains both overlay AND acroform routing - adapter stays

**Files**: UI components with "overlay" in CSS  
**Reason**: CSS overlays unrelated to PDF system - cosmetic UI

**File**: `src/integrations/supabase/types.ts`  
**Reason**: Auto-generated, will update after DB cleanup

## Deletion Order

1. **Code Files** (immediate):
   - Delete overlay function
   - Delete config files  
   - Update documentation

2. **Database Cleanup** (plan only):
   - Remove unused views
   - Clean calibration data
   - Update RLS policies

3. **Dependencies** (future):
   - Evaluate pdf-lib removal after AcroForm preview replacement

## Rollback Plan

All deletions tracked in single commit with descriptive message:
```bash
# To rollback all overlay deletions
git revert [OVERLAY_DELETION_COMMIT_SHA]

# To rollback specific files
git checkout [PREVIOUS_COMMIT_SHA] -- [FILE_PATH]
```

## Validation Checklist

- [ ] Build passes with deletions
- [ ] All tests pass  
- [ ] PDF_ENGINE=acroform works in staging
- [ ] No broken imports or references
- [ ] AcroForm PDFs generate successfully
- [ ] Database cleanup plan reviewed (not executed)

---
**Risk Level**: LOW (evidence-based deletion with 7-day usage validation)  
**Rollback Complexity**: SIMPLE (single commit revert)  
**Business Impact**: NONE (features preserved via AcroForm)