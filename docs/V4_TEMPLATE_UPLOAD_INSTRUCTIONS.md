# V4 Template Upload Instructions

## Problem
The v4 AcroForm template (`Michigan_Manifest_AcroForm_V4.pdf`) needs to be uploaded to Supabase storage for the PDF generation to work.

## Quick Fix

### Option 1: Manual Upload via Supabase Dashboard
1. Go to [Supabase Storage Dashboard](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/storage/buckets/manifests)
2. Navigate to the `manifests` bucket
3. Go to the `templates` folder
4. Upload the v4 template file with the exact name: `Michigan_Manifest_AcroForm_V4.pdf`
5. The file should be in your local `public/manifests/templates/Michigan_Manifest_AcroForm_V4.pdf`

### Option 2: Using SQL (Alternative)
If the template is already accessible via URL, you can run this SQL in Supabase:

```sql
-- This would work if the file was accessible via HTTP
-- INSERT INTO storage.objects (name, bucket_id, owner, metadata) 
-- VALUES ('templates/Michigan_Manifest_AcroForm_V4.pdf', 'manifests', NULL, '{}'::jsonb);
```

## Verification

After uploading, test by:
1. Going to Driver Dashboard
2. Creating a new manifest 
3. The PDF should generate without storage errors

## Expected Storage Structure
```
manifests/
  templates/
    Michigan_Manifest_AcroForm.pdf          (v3 - for rollback)
    Michigan_Manifest_AcroForm_V4.pdf       (v4 - current)
  signatures/
    [signature files]
  [generated PDFs]
```

## Current Status
- ✅ v4 template copied to `public/manifests/templates/`
- ❌ v4 template not yet in Supabase storage 
- ✅ Code updated to use v4 template by default
- ✅ v3 template available for rollback

The system will work once the v4 template is uploaded to storage.