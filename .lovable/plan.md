

# Outbound Delivery Assignment System

## What You're Asking For

Right now, Jody has to manually create outbound manifests from scratch. You want the same workflow as Brenner's inbound pickups:

| Current Inbound (Brenner) | Desired Outbound (Jody) |
|--------------------------|-------------------------|
| Dispatcher schedules pickup | Dispatcher schedules outbound delivery |
| Brenner sees assignment on dashboard | Jody sees assignment on dashboard |
| Brenner taps assignment to start workflow | Jody taps assignment to start manifest workflow |
| Creates manifest, collects signatures | Creates manifest, collects 3 signatures |

## What Will Be Built

### 1. Outbound Assignments Table

A new `outbound_assignments` table to track scheduled outbound deliveries:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | Organization scope |
| `destination_entity_id` | uuid | Where material is going (NTech) |
| `driver_id` | uuid | Assigned driver (Jody) |
| `vehicle_id` | uuid | Optional vehicle assignment |
| `scheduled_date` | date | When the delivery is scheduled |
| `material_form` | enum | Optional estimate: shreds, whole tires, etc. |
| `estimated_quantity` | numeric | Optional estimated quantity |
| `estimated_unit` | enum | tons, pte, cubic_yards |
| `notes` | text | Dispatcher notes for driver |
| `status` | enum | scheduled, in_progress, completed, cancelled |
| `manifest_id` | uuid | Links to manifest once created |
| `created_at`, `updated_at` | timestamp | Audit fields |

### 2. Dispatcher Interface for Scheduling

New scheduling dialog for office staff to create outbound assignments:

```text
Schedule Outbound Delivery
==========================

Driver: [Jody Green           v]
Date:   [Feb 6, 2026         📅]

Destination: [NTech Processing v]

---- Optional Pre-fill ----
Material Type: [Shredded       v]
Est. Quantity: [40] [tons      v]

Notes for Driver:
[Full trailer of shreds ready to go]

         [Cancel]  [Schedule Delivery]
```

### 3. Driver Dashboard Integration

Jody's dashboard will show scheduled outbound deliveries alongside his other work:

```text
┌──────────────────────────────────────────────────┐
│ Today's Outbound Deliveries                      │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ 🚚  NTech Processing                       │   │
│ │     Est: ~40 tons shredded                 │   │
│ │     Notes: Full trailer ready              │   │
│ │                                            │   │
│ │     [Start Delivery]                       │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 4. "Start Delivery" Flow

When Jody taps "Start Delivery":
1. Opens the existing OutboundManifestWizard
2. Pre-fills destination from assignment
3. Pre-fills estimated material (if dispatcher provided)
4. Jody can adjust quantities based on actual load
5. Collect signatures, create manifest
6. Assignment marked complete, linked to manifest

### 5. Outbound Assignments Page for Dispatchers

New page to manage all outbound deliveries:
- View scheduled, in-progress, completed deliveries
- Filter by date, driver, destination
- Quick-schedule new deliveries
- See manifest links for completed deliveries

## Database Migration

```sql
-- Create outbound_assignments table
CREATE TABLE outbound_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  destination_entity_id uuid NOT NULL REFERENCES entities(id),
  driver_id uuid REFERENCES users(id),
  vehicle_id uuid REFERENCES vehicles(id),
  scheduled_date date NOT NULL,
  material_form material_form,
  estimated_quantity numeric,
  estimated_unit unit_basis,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  manifest_id uuid REFERENCES manifests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE outbound_assignments ENABLE ROW LEVEL SECURITY;

-- Drivers see their own assignments
CREATE POLICY "Drivers see own outbound assignments"
  ON outbound_assignments FOR SELECT
  USING (driver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Drivers can update their own assignments (status, manifest_id)
CREATE POLICY "Drivers update own outbound assignments"
  ON outbound_assignments FOR UPDATE
  USING (driver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Admins/dispatchers can manage all
CREATE POLICY "Admins manage outbound assignments"
  ON outbound_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND uo.organization_id = outbound_assignments.organization_id
        AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
    )
  );
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useOutboundAssignments.ts` | CRUD operations for outbound assignments |
| `src/components/outbound/ScheduleOutboundDialog.tsx` | Dispatcher dialog to schedule deliveries |
| `src/components/driver/DriverOutboundAssignments.tsx` | Driver view of their scheduled outbound deliveries |
| `src/pages/OutboundSchedule.tsx` | Admin page for managing outbound schedule |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DriverDashboard.tsx` | Add "Today's Outbound" section |
| `src/pages/driver/DriverOutboundManifests.tsx` | Add "Scheduled" tab alongside Pending/Completed |
| `src/components/driver/OutboundManifestWizard.tsx` | Accept optional `assignmentId` prop to pre-fill data |
| `src/components/AppSidebar.tsx` | Add "Outbound Schedule" nav for dispatchers |
| `src/App.tsx` | Add route for outbound schedule page |

## Driver Workflow After Implementation

1. **Dispatcher schedules**: "Jody, take a load to NTech on Thursday"
2. **Jody logs on** Thursday morning, sees the assignment on his dashboard
3. **Jody taps "Start Delivery"**, wizard opens pre-filled with destination
4. **Jody enters actual quantities** after loading (can adjust dispatcher's estimates)
5. **Collects signatures** (Generator at BSG, Hauler self-sign, Receiver at NTech)
6. **Manifest created** and linked to assignment
7. **Assignment marked complete** with manifest reference

## What Stays the Same

- The existing "New Outbound" button still works for ad-hoc manifests
- The OutboundManifestWizard remains the same, just gets an optional pre-fill
- Three-signature workflow unchanged
- PDF generation and shipment auto-creation unchanged

## Result

Jody's outbound workflow will work just like Brenner's inbound workflow:
- Scheduled by dispatch
- Visible on driver dashboard
- Tap to start, complete the workflow
- Full audit trail from schedule to manifest

