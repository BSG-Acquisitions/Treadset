
# Driver Outbound Manifest Workflow with Three Signatures

## What You Need

Jody needs to create digital manifests when taking material OUT of BSG to another processor (like NTech), with **three signatures** just like inbound manifests:

| Role | Inbound (Brenner's pickups) | Outbound (Jody's deliveries) |
|------|----------------------------|------------------------------|
| Generator | Client (tire shop) | BSG (your facility) |
| Hauler | BSG driver (Brenner) | Jody (outbound driver) |
| Receiver/Processor | BSG front office | NTech (destination processor) |

## Three-Signature Flow (Mirrors Inbound)

### Stage 1: At BSG (Before Departure)
Jody opens his phone and:
1. Selects destination (NTech)
2. Enters material type and quantity
3. Gets **Generator signature** (BSG representative signs to confirm material left facility)
4. Signs as **Hauler** (Jody signs as transporting driver)
5. System generates 2-signature PDF and emails to NTech as advance notice

### Stage 2: At NTech (Upon Arrival)
Jody opens completed outbound manifest on his phone:
1. NTech representative signs as **Receiver** on Jody's phone
2. System regenerates 3-signature PDF
3. Emails final manifest to NTech (and optionally back to BSG)

This is exactly how your inbound receiver signatures work - but on the driver's mobile device instead of the front office desktop.

## Database Changes Required

Add columns to `manifests` table for outbound tracking:

| Column | Type | Purpose |
|--------|------|---------|
| `direction` | enum ('inbound', 'outbound') | Distinguish manifest type (default: 'inbound') |
| `destination_entity_id` | uuid (FK to entities) | Where material is going (NTech) |
| `origin_entity_id` | uuid (FK to entities) | Where material came from (BSG) |
| `material_form` | enum | Whole tires, shreds, etc. (already exists) |

## Wizard Flow (Mobile-Optimized)

```text
Step 1: Destination
========================
Where are you taking this load?

┌─────────────────────────────────┐
│ NTech Processing            [v] │
└─────────────────────────────────┘

[+ Add New Destination]

Destination Details:
123 Industrial Blvd, Detroit MI
MI Processor Reg: PRO-12345

                    [Next ->]


Step 2: Material & Quantity
============================
What are you hauling?

Material: [Shredded Material    v]
Quantity: [  42  ] [Tons        v]

= 3,738 PTE  |  42.00 tons

             [<- Back]  [Next ->]


Step 3: Signatures (At BSG)
============================
Collect Origin Signatures

BSG Generator Signature:
┌─────────────────────────────────┐
│       [Signature Canvas]        │
└─────────────────────────────────┘
Print Name: [Facility Manager   ]

Hauler (Driver) Signature:
┌─────────────────────────────────┐
│       [Signature Canvas]        │
└─────────────────────────────────┘
Print Name: Jody Green

             [<- Back]  [Next ->]


Step 4: Review & Submit
========================
Outbound Manifest Preview

From: BSG Tire Recycling
To:   NTech Processing
Material: Shredded - 42 tons
Date: Feb 4, 2026

[Check] Generator signed (BSG)
[Check] Hauler signed (Jody)
[_____] Receiver pending (NTech)

             [<- Back]  [Create Manifest]


Step 5: Manifest Created!
=========================
Manifest #OUT-2026-0001 Created

[View PDF]  [Share PDF]

Receiver signature pending - complete
this when you arrive at NTech

              [Go to My Outbound Manifests]
```

## Receiver Completion (On Jody's Phone)

When Jody arrives at NTech, he opens his outbound manifests and taps "Complete Delivery":

```text
Complete Delivery - OUT-2026-0001
=================================

From: BSG Tire Recycling
To:   NTech Processing
Material: Shredded - 42 tons

Receiver Signature:
┌─────────────────────────────────┐
│       [Signature Canvas]        │
└─────────────────────────────────┘
Print Name: [NTech Rep          ]

              [Complete Manifest]
```

This captures the third signature, regenerates the PDF with all three signatures, and auto-creates the shipment record for state reporting.

## Driver Capability Control

New capability: `outbound_hauler`
- Grant to Jody via existing driver capabilities system
- Only drivers with this capability see the "Outbound Manifest" button
- Uses the same pattern as `semi_hauler` capability

## Auto-Link to Shipments

When outbound manifest is completed (all 3 signatures):
- Automatically insert row into `shipments` table
- Links: `manifest_id` -> the outbound manifest
- Origin: BSG entity
- Destination: Selected processor (NTech)
- Quantity: From manifest material entry
- Flows directly into Michigan Reports "Outbound" tab

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/driver/OutboundManifestWizard.tsx` | 5-step wizard for creating outbound manifests |
| `src/components/driver/OutboundReceiverDialog.tsx` | Mobile dialog for capturing receiver signature at destination |
| `src/pages/driver/DriverOutboundCreate.tsx` | Page wrapper for the wizard |
| `src/pages/driver/DriverOutboundManifests.tsx` | List of driver's outbound manifests |
| `src/hooks/useOutboundManifests.ts` | CRUD operations for outbound manifests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DriverDashboard.tsx` | Add "Outbound Manifest" quick action button (capability-gated) |
| `src/hooks/useDriverCapabilities.ts` | Add `useHasOutboundHaulerCapability` hook |
| `src/App.tsx` | Add routes: `/driver/outbound/new`, `/driver/outbound`, `/driver/outbound/:id/complete` |
| `src/hooks/useShipments.ts` | Add function to auto-create shipment from completed outbound manifest |

## Database Migration

```sql
-- Add outbound tracking columns to manifests
ALTER TABLE manifests 
  ADD COLUMN direction text DEFAULT 'inbound' 
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN destination_entity_id uuid REFERENCES entities(id),
  ADD COLUMN origin_entity_id uuid REFERENCES entities(id);

-- Index for fast outbound queries
CREATE INDEX idx_manifests_direction ON manifests(direction) 
  WHERE direction = 'outbound';
```

## Technical Notes

### PDF Generation for Outbound

The existing `useManifestIntegration` hook and PDF generation will work with outbound manifests. The overrides will flip the roles:
- Generator fields -> BSG facility info (from `origin_entity_id`)
- Receiver fields -> NTech info (from `destination_entity_id`)

### Signature Fields Already Exist

The current manifest table already has all needed signature fields:
- `generator_signed_at`, `customer_signature_png_path` (Generator/BSG)
- `hauler_signed_at`, `driver_signature_png_path` (Hauler/Jody)
- `receiver_signed_at`, `receiver_sig_path` (Receiver/NTech)

These work the same for outbound - we just use them in the mobile driver workflow instead of the front office.

### Mobile-First Design

The outbound wizard will be optimized for Jody's phone:
- Large touch targets
- Signature canvas with proper touch handling (like existing ManifestWizard)
- Offline queue support (same pattern as inbound)
- Auto-save signatures between steps

## Result

After implementation:
- Jody can create outbound manifests on his phone just like Brenner does for inbound
- Three-signature workflow: BSG signs, Jody signs, NTech signs (on Jody's phone)
- PDFs generate at both stages (2-sig advance notice, 3-sig final)
- Completed manifests auto-create shipment records
- All tonnage flows to Michigan Reports for state compliance
- Same capability control system - admin grants `outbound_hauler` to Jody
