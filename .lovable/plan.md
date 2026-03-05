

# Entech Inc. — Entity vs Client Question

## Current State

**Entech Inc. exists as a Client** (ID: `63b6797d-97a4-4f2f-8009-2eed3463db4c`) but does **NOT** exist as an Entity in the `entities` table. The only entity currently in that table is a hauler.

This means the shipment auto-creation code on line 1230-1235 of `DriverManifestCreationWizard.tsx` will **silently fail** every time Jody drops a trailer at Entech — it tries to fuzzy-match `legal_name` in `entities` and finds nothing. The manifest still completes fine, but no outbound shipment record gets created.

## Should Entech Be a Client?

**It doesn't matter operationally** — and here's why:

- **Clients** = businesses you pick up tires FROM (generators). Used for scheduling pickups, billing, manifesting inbound loads.
- **Entities** = businesses tracked for compliance shipment records (processors, end users, haulers). Used for outbound tracking and state reporting.

Entech is a **processor** — you send tires TO them. They're not a generator you pick up from. But you had to add them as a client because the trailer route system uses the clients table to populate the stop/manifest data.

**This is fine.** Having them as a client doesn't hurt anything — it just means they show up in client lists. The real gap is that they're missing as an **entity** with `kind: 'processor'`, which is what the shipment tracking needs.

## Plan

### 1. Add Entech Inc. as a `processor` entity
Insert a record into the `entities` table with `kind: 'processor'` and `legal_name: 'Entech Inc.'` so the shipment auto-creation code can find it.

### 2. Add BSG as an entity (origin)
The shipment code on line 1221-1227 looks for an entity with `entity_type = 'origin'` — but the `entities` table doesn't have an `entity_type` column; it has `kind`. This query will always fail. We need to:
- Add BSG Tire Recycling as an entity with `kind: 'processor'` (since BSG is also a processor)
- Fix the origin lookup query to use `kind` instead of the non-existent `entity_type` column

### 3. Fix the origin entity lookup in the wizard
Update lines 1221-1227 to query by `kind = 'processor'` (or a new convention) for the org's own entity, instead of `entity_type = 'origin'` which doesn't exist. The `useOwnEntity` hook already does this correctly — we should reuse it.

### Summary

| Action | What |
|---|---|
| Insert entity | Entech Inc. as `kind: 'processor'` |
| Insert entity | BSG Tire Recycling as `kind: 'processor'` (org's own entity) |
| Fix wizard code | Use `useOwnEntity` hook instead of broken `entity_type = 'origin'` query |
| No change needed | Entech staying as a client is harmless |

After this, when Jody drops a trailer at Entech, the shipment record will actually be created and show up in outbound reporting.

