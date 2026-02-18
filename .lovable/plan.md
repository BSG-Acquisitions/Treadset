
# Fix: Manifest Address Data Must Only Come From Client Record, Never Location/Geocoding

## The Exact Problem

In `src/hooks/useManifestIntegration.ts`, the `convertManifestToAcroForm` function has two fallback lines that introduce geocoded location data into the manifest when client fields are blank:

```text
Line 38: const mailingAddress = manifestData.client?.mailing_address || manifestData.location?.address || '';
Line 40: const physicalAddress = manifestData.client?.physical_address || manifestData.location?.address || mailingAddress;
```

When `client.mailing_address` is null or empty, the code falls back to `location.address` — which is the geocoded locations table record. It then tries to parse the city/state/zip out of that single string using a regex. For Unique Auto Care at 10301 M-102, the geocoder resolved the location to "Grosse Pointe Woods" instead of "Detroit," which is what got stamped on the manifest.

The manifest fetch query also pulls in the entire locations record (`location:locations(*)`), making all geocoded data available to this fallback logic.

## The Fix

### 1. Remove all `location?.address` fallbacks from `convertManifestToAcroForm`

The address fields for the manifest generator section should ONLY read from the `clients` table. If a client's address fields are blank, the manifest should show blank — not geocoded location data.

**Change line 38:**
```text
BEFORE: manifestData.client?.mailing_address || manifestData.location?.address || ''
AFTER:  manifestData.client?.mailing_address || ''
```

**Change line 40:**
```text
BEFORE: manifestData.client?.physical_address || manifestData.location?.address || mailingAddress
AFTER:  manifestData.client?.physical_address || manifestData.client?.mailing_address || ''
```

This means:
- `generator_mail_address` = `client.mailing_address` only
- `generator_city` = `client.city` only (no regex parsing fallback from address string)
- `generator_state` = `client.state` only
- `generator_zip` = `client.zip` only
- `generator_physical_address` = `client.physical_address` or falls back to `client.mailing_address`
- `generator_physical_city` = `client.physical_city` or `client.city`
- `generator_physical_state` = `client.physical_state` or `client.state`
- `generator_physical_zip` = `client.physical_zip` or `client.zip`

### 2. Remove `parseCityStateZip` usage for city/state/zip fields

Since we are no longer falling back to an address string from the locations table, the `parseCityStateZip` function is no longer needed for the generator address fields. The city, state, and zip all have their own dedicated columns on the `clients` table (`city`, `state`, `zip`, `physical_city`, `physical_state`, `physical_zip`). Those should be used directly.

The `parseCityStateZip` helper function itself can stay (it may have other uses), but it should not be called in the city/state/zip field assignments.

### 3. Remove `location` from the manifest fetch query (optional but clean)

The fetch query in `useManifestIntegration` currently selects `location:locations(*)`. Since location data should never be used for manifest addresses, we can remove it from the select entirely to prevent any future accidental use. However, the `location` join may be needed for other data on the manifest row — we can simply not reference `manifestData.location` in the address fields.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useManifestIntegration.ts` | Remove `location?.address` fallbacks on lines 38 and 40; update city/state/zip fields to only use direct `client.*` columns with no regex-parsed fallbacks from address strings |

## Result After Fix

Every manifest will use exactly what is stored in the `clients` table:
- `clients.mailing_address` → Generator mailing address
- `clients.city` → Generator city (always "Detroit" for Unique Auto Care, not "Grosse Pointe Woods")
- `clients.state` → Generator state
- `clients.zip` → Generator zip
- `clients.physical_address/city/state/zip` → Generator physical address fields

Geocoding is completely isolated from manifesting. It is only used for routing (map coordinates) and will never touch a manifest PDF again.

## Note on Unique Auto Care's Existing Manifests

For the manifests that already exist with "Grosse Pointe Woods" on them, those will need to be voided and re-signed using the new "Void & Redo" workflow that was just implemented. After this fix, any newly generated manifest for Unique Auto Care will correctly show "Detroit."
