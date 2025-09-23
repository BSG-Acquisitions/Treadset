# AcroForm Template v4 Integration

## Overview

This document outlines the integration of the new v4 AcroForm PDF template for manifests, including field mapping updates, auto-copy functionality, and rollback procedures.

## Template Configuration

### Environment Variables
- `PDF_TEMPLATE_VERSION=4` - Use v4 template (staging first)
- `PDF_TEMPLATE_VERSION=3` - Rollback to v3 template
- Default: v4 if not specified

### Template Locations
- **v3 (legacy)**: `public/manifests/templates/Michigan_Manifest_AcroForm.pdf`
- **v4 (current)**: `public/manifests/templates/Michigan_Manifest_AcroForm_V4.pdf`

## Key Changes in v4

### 1. Corrected Field Names
| Issue | v3 Field Name | v4 Field Name |
|-------|---------------|---------------|
| Typo | `Reciever_State` | `Receiver_State` |
| Typo | `Reciever_Phone` | `Receiver_Phone` |
| Space/Hash | `MI_SCRAP_TIR _HAULER_REG_#` | `MI_SCRAP_TIRE_HAULER_REG_` |
| Spacing | `Passenger tire equivalents` | `Passenger_Tire_Equivalents` |
| Format | `MANIFEST_#` | `Manifest_Number` |
| Format | `VEHICLETRAILER` | `Vehicle_Trailer` |

### 2. Enhanced Signature Fields
v4 uses explicit signature field names with `_es_:signer:signature` suffix:
- `Generator_Signature _es_:signer:signature`
- `Hauler_Signature _es_:signer:signature`
- `Processor_Signature _es_:signer:signature`

### 3. Separate Physical Address Fields
v4 provides dedicated fields for Generator physical address:
- `Physical_Mailing_Address`
- `Physical_City`
- `Physical_State`
- `Physical_Zip`

## Auto-Copy Feature

**Generator Mailing → Physical Auto-Copy**
```typescript
const shouldCopyPhysical = !domain.generator.physical_address || 
                          domain.generator.physical_address.trim() === '';
```

When enabled, if Generator physical address is blank, the system automatically copies:
- Mailing Address → Physical Address
- City → Physical City  
- State → Physical State
- ZIP → Physical ZIP

## Implementation Files

### Core Files
- `src/lib/pdf/templateConfig.ts` - Template version management
- `src/hooks/useAcroFormManifestV4.ts` - v4-specific generation hook
- `src/mappers/domainToAcroForm.ts` - Updated with v4 field names
- `public/templates/manifest-v4-fields.json` - Field reference

### Edge Functions
- `supabase/functions/generate-acroform-manifest/` - Handles both v3 and v4
- `supabase/functions/extract-acroform-fields/` - Field extraction utility

## Field Validation

The `writeIfExists()` function ensures only valid template fields are written:

```typescript
export function writeIfExists(
  templateKeys: string[], 
  key: string, 
  value: string,
  targetObject: Record<string, string>
): void
```

- Logs warnings for unknown mapper keys
- Logs warnings for fields not found in template
- Only writes fields that exist in the target template

## Verification Checklist

### Staging Verification
1. **Admin Manifest Generation**
   - [ ] Generator City/State/Zip boxes filled
   - [ ] Physical fields populated (auto-copy if enabled)
   - [ ] Hauler block complete with corrected field names
   - [ ] Receiver block shows corrected spelling
   - [ ] All three signature fields render properly

2. **Driver Manifest Generation**
   - [ ] Same field validation as Admin
   - [ ] Driver-specific tire count inputs work
   - [ ] Weight calculations appear correctly

### Production Deployment
1. Set `PDF_TEMPLATE_VERSION=4` in production
2. Monitor logs for field mapping warnings
3. Verify first few generated manifests

## Rollback Procedure (60 seconds)

**Emergency Rollback to v3:**
1. Set `PDF_TEMPLATE_VERSION=3` 
2. Redeploy application
3. All new manifests will use v3 template

**Files Preserved for Rollback:**
- v3 template: `Michigan_Manifest_AcroForm.pdf`
- v3 field mappings in `templateConfig.ts`
- Legacy converter in `useAcroFormManifest.ts`

## Monitoring & Logs

**Key Log Events:**
- `[PDF_TEMPLATE_V4]` - Template-specific operations
- `[PDF_ADAPTER]` - PDF generation routing
- Field mapping warnings for unknown/missing fields

**Metrics to Watch:**
- PDF generation success rate
- Field mapping warnings count
- Template download failures

## Field Reference

Total v4 fields: **43**

**By Section:**
- Header: 2 fields
- Generator: 11 fields (7 mailing + 4 physical)
- Hauler: 8 fields
- Receiver: 6 fields  
- Weights: 7 fields
- Signatures: 9 fields

See `public/templates/manifest-v4-fields.json` for complete field listing.

## Confirmation

✅ **Old template retained for rollback; no deletions performed.**