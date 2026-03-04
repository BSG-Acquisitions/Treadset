

## Plan: Fix Standalone Email, Client Auto-fill, and 3-Signature NTech Drop Flow

### Problem Summary

Three issues:

1. **Email never sends in standalone/trailer mode** — the submit logic explicitly skips email when `isStandalone` is true (line 1057: `if (!isStandalone && ...)`). Even if it didn't skip, standalone mode doesn't fetch client data, so there's no email address available.

2. **Manifest DOES go to receiver signatures** — the status is correctly set to `AWAITING_RECEIVER_SIGNATURE`, so it will appear in the admin's Receiver Signatures page. This part works.

3. **NTech drop needs 3 signatures on-site** — When Jody drops a trailer at NTech, the roles flip: BSG is the generator, Jody is the hauler, NTech is the receiver. He needs to collect all 3 signatures right there (not wait for the admin portal to add the receiver signature later).

### Changes

#### 1. Add client search/select to standalone mode (DriverManifestCreationWizard.tsx)
- Replace the plain text "Generator Name" input in standalone mode with a **searchable client dropdown** (similar to how dropoff processing works)
- When a client is selected, store the full client object (including email, address, phone, etc.) in a new `standaloneClientData` state
- Set `resolvedClientId` to the selected client's ID
- Auto-fill `standaloneGeneratorName` from `client.company_name`
- This ensures the manifest has a proper `client_id` and the client's email is available for sending

#### 2. Fix email sending for standalone mode (DriverManifestCreationWizard.tsx)
- Remove the `!isStandalone` guard on the email sending block (around line 1057)
- In standalone mode, use `standaloneClientData?.email` instead of `pickupData.client?.email`
- Send the same formatted email with the manifest PDF attached, identical to Brenner's flow

#### 3. Add "Drop to Processor" flow with 3 signatures (DriverManifestCreationWizard.tsx)
- Add a new prop `manifestMode?: 'pickup' | 'drop_to_processor'` to the wizard
- When `manifestMode === 'drop_to_processor'`:
  - **Generator** = BSG (auto-filled from organization/hauler data — BSG is the generator since it's their material)
  - **Hauler** = Jody (auto-filled from the driver's hauler selection, same as now)
  - **Receiver** = NTech (selected from client search — the destination processor)
  - Add a **third signature pad** for the receiver signature, collected on-site
  - On submit: set status to `COMPLETED` (not `AWAITING_RECEIVER_SIGNATURE`) since all 3 signatures are collected
  - Generate the full 3-signature PDF immediately
  - Email to the receiver (NTech)

#### 4. Wire up the mode from DriverStopEventActions.tsx
- For `drop_full` events, pass `manifestMode="drop_to_processor"` to the wizard
- For `pickup_full` events, keep the default `manifestMode="pickup"` behavior
- Also wire this in `GuidedStopEvents.tsx` for planned events

### Files to Edit

| File | Change |
|------|--------|
| `src/components/driver/DriverManifestCreationWizard.tsx` | Add client search dropdown for standalone, fix email sending, add receiver signature step for drop_to_processor mode |
| `src/components/trailers/DriverStopEventActions.tsx` | Pass `manifestMode="drop_to_processor"` for `drop_full` events |
| `src/components/trailers/GuidedStopEvents.tsx` | Pass `manifestMode` based on event type for planned events |

### What This Enables

- **Pickup from client (e.g., Tire Disposal)**: Jody searches for the client → data auto-fills → 2 signatures (generator + hauler) → PDF generated → emailed to client → shows in Receiver Signatures for BSG to sign later
- **Drop at processor (e.g., NTech)**: BSG auto-fills as generator → Jody as hauler → Jody searches for NTech as receiver → 3 signatures collected on-site → complete PDF generated immediately → emailed to NTech → manifest marked COMPLETED

