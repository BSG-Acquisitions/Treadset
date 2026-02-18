
# Fix: Physical Address Field Should Only Contain Street Number & Name

## The Problem

On manifests for clients like AA Parking, the physical address section looks like this:

```text
Physical Address: 24260 Mound Rd, Warren, MI 48091   ← full address string in ONE line
Physical City:    Warren
Physical State:   MI
Physical Zip:     48091
```

When it should look like:

```text
Physical Address: 24260 Mound Rd   ← street only
Physical City:    Warren
Physical State:   MI
Physical Zip:     48091
```

## Root Cause

In `src/hooks/useManifestIntegration.ts`, the `generator_physical_address` field is built as:

```text
physicalAddress = client.physical_address || client.mailing_address
```

For most clients, `physical_address` is NULL in the database (because they have the same mailing and physical address). So it falls back to `mailing_address`. When the `mailing_address` field in the database was entered as a full combined string (e.g., `"24260 Mound Rd, Warren, MI 48091"`), the entire string — city, state, and zip included — gets stamped into the `Physical_Mailing_Address` field on the PDF. The city/state/zip fields right below it are then also populated separately, creating duplication.

The PDF template has **separate fields** for street, city, state, and zip. The street field should only ever contain the street portion.

## The Fix

Add a `stripCityStateZip` helper that removes any trailing `, City, ST XXXXX` portion from an address string before putting it into the street field. This ensures:

- If a client has `mailing_address = "24260 Mound Rd"` (street only) → stays as-is ✅
- If a client has `mailing_address = "24260 Mound Rd, Warren, MI 48091"` (full string) → stripped to `"24260 Mound Rd"` ✅
- If `physical_address` is NULL, falls back to the stripped `mailing_address` ✅

The same treatment is applied to `generator_mail_address` for the mailing address street field — for consistency and to protect against any clients whose mailing address was stored as a full string.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useManifestIntegration.ts` | Add `stripCityStateZip()` helper; apply it to `generator_mail_address` and `generator_physical_address` before they are written to the PDF field mapping |

## Technical Detail

The new helper strips anything that looks like `, City ST ZIP` or `, City, ST ZIP` from the end of an address string:

```text
"24260 Mound Rd, Warren, MI 48091" → "24260 Mound Rd"
"10301 M-102, Detroit, MI 48221"   → "10301 M-102"
"24260 Mound Rd"                   → "24260 Mound Rd"  (unchanged — no stripping needed)
```

The city, state, and zip fields are already sourced directly from their own individual database columns (`client.city`, `client.state`, `client.zip`) and are not affected by this change.

## What Dispatchers Will See After the Fix

Both the mailing and physical address street lines on every manifest will contain only the street number and street name. The city, state, and zip will appear only on their own dedicated lines — no duplication.
