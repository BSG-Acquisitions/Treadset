
# Two Problems, Two Solutions

## Problem 1: How to Detect Manifest Issues (Missing Signatures, Bad Timestamps, Wrong Names)

Currently there is no automated detection. You find out when someone prints or emails a manifest and notices something wrong. The fix is a **Manifest Health Scan** — a new page that automatically identifies every manifest with a known issue.

### What the scan checks:

| Check | Why it matters |
|---|---|
| `customer_signature_png_path` is null | Generator signature image missing from manifest |
| `driver_signature_png_path` is null | Hauler signature image missing from manifest |
| `signed_by_name` is null or blank | Generator's printed name is blank on PDF |
| `signed_by_title` is null or blank | Hauler's printed name is blank on PDF |
| `generator_signed_at` is null | Generator timestamp missing |
| `hauler_signed_at` is null | Hauler timestamp missing |
| `client.city` is blank | City will be empty on manifest address line |
| `receiver_signed_at` is null (for COMPLETED status) | Marked complete but no receiver signature |

Each manifest gets a health score and a list of specific issues found. The page gives you Void & Redo buttons for the ones that need to be redone.

---

## Problem 2: Ethan's Signatures and Timestamps Are Wrong

**Ethan has the admin role — that is not the problem.** The routes, the wizard, and the PDF generation all allow admin. The database confirms his role is `admin`.

Looking at the manifest data from days where Ethan was completing paperwork, those manifests show:
- `customer_signature_png_path: null`
- `driver_signature_png_path: null`
- `signed_by_name: null`

This means the **Supabase Storage upload step is failing silently**. When the signature upload to the `manifests` storage bucket fails, the code catches the error and shows a toast — but sometimes in a degraded network or stale-auth state, the upload error is swallowed and the manifest continues through with null signature paths. Because the timestamp is generated from `generator_signed_at` which relies on the signature upload succeeding first, a failed upload cascade means the timestamp is also wrong.

### Root Causes

**Root Cause A — No retry on failed uploads:**
If Ethan's storage upload times out or fails (network hiccup, session edge case), the wizard just shows a toast and returns. There is no retry and no clear indication to Ethan that he needs to start over. He may have tapped Next and assumed it worked.

**Root Cause B — No storage upload verification before proceeding:**
After uploading, the code does not verify the file actually landed in storage. It trusts the Supabase SDK response. If the upload silently fails (non-throwing error), `genSigPath` stays null and the manifest is created without signatures.

**Root Cause C — Timestamp is derived at wrong moment:**
`generatorSignedAt` is captured at `new Date()` at the moment of form submission — not at the moment the signature canvas was actually signed. If the upload takes 30 seconds (slow network), the timestamp on the manifest is 30 seconds later than when the customer actually signed. This is the "incorrect timestamp" you observed.

### The Fix

**Fix A — Capture the timestamp at the moment the signature pad is cleared/completed, not at submit time.**
When the user finishes drawing their signature and taps "Save Signatures," lock in the timestamp at that exact second. Store it in component state alongside the signature path. When the form submits, use the locked timestamp, not `new Date()`.

**Fix B — Add a pre-submit verification check.**
Before proceeding past the signatures step, confirm both signature paths are non-null. If either is missing, block the Next button and show a clear error: "Signatures must be saved before continuing."

**Fix C — Add an upload status indicator on the Signatures step.**
Show a clear checkmark or "Saved" badge next to each signature pad after a successful upload. This gives Ethan visual confirmation that his signature was actually captured, rather than guessing.

**Fix D — Add a fallback for storage permission errors.**
Wrap the upload in explicit error handling that distinguishes between a permission error (storage RLS) and a network error, and shows the user a specific, actionable message instead of a generic toast.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/ManifestHealth.tsx` | New page — Manifest Health Scan dashboard, lists all manifests with detected issues, grouped by issue type, with Void & Redo buttons |
| `src/hooks/useManifestHealthScan.ts` | New hook — fetches all manifests + client data, runs compliance checks, returns categorized results with issue descriptions |
| `src/components/AppSidebar.tsx` | Add "Manifest Health" nav item under the admin/ops_manager group |
| `src/App.tsx` | Register the `/manifest-health` route (admin, ops_manager, super_admin only) |
| `src/components/driver/DriverManifestCreationWizard.tsx` | (1) Capture signature timestamps at the moment of canvas completion, not at submit time. (2) Add upload status badges on the Signatures step. (3) Block Next button if signature paths are null. (4) Add specific error handling for storage permission vs. network errors. |

---

## What Will Be Different After This Fix

- The Manifest Health page will show you — right now — every manifest that has missing signatures, missing names, or blank city/state on the client address
- The 20+ manifests currently showing `signed_by_name: null` will appear in the scan so you can decide which to void and redo
- When Ethan (or any admin) completes a manifest, he will see a clear "Signature Saved" confirmation badge before being allowed to proceed
- The Next button on the Signatures step will be disabled until both uploads succeed
- Timestamps will reflect the actual moment the signature was drawn, not the moment the form was submitted
- Any storage upload failure will show a specific error message explaining what failed and what to do

## Note on the Historical Manifests with Missing Signatures

The 20 manifests currently missing `signed_by_name` and signature paths — those were completed using an earlier version of the wizard (before the current two-signature flow was fully hardened). They cannot be retroactively signed since the moment has passed. The Manifest Health page will surface all of them so you can review each one and decide: Void & Redo for important clients, or leave as-is for minor ones (like Walk-in drop-offs).
