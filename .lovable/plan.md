

## Diagnosis: Why Khiyron and Moses don't appear in the route scheduling dropdown

### What I found

Both drivers are correctly set up in the database:

| Name | Email | Org | Role | Active |
|---|---|---|---|---|
| Moses Odinma | makeaway96@gmail.com | BSG Logistics | driver | ✅ |
| Khiyron Amerson | khiyronamersonbbt@gmail.com | BSG Logistics | driver + dispatcher | ✅ |

So they exist as drivers — that's not the problem.

### The actual bug

The "Schedule Pickup" dialog (`SchedulePickupDialog.tsx` and `SchedulePickupWithDriverDialog.tsx`) **does not have a driver dropdown at all**. It has a **truck/hauler dropdown**, and it pulls the driver implicitly from `vehicles.assigned_driver_id`.

Looking at your `vehicles` table for BSG Logistics, only 2 vehicles have an `assigned_driver_id` set:
- Truck 002 - Test Driver
- Truck 003 - Jody Green

Khiyron and Moses are **not assigned to any vehicle**, so they'll never show up — there's literally no UI path that lists them when scheduling a normal pickup. Worse: in `SchedulePickupWithDriverDialog`, if a vehicle has no `assigned_driver_id` it throws "Selected vehicle does not have an assigned driver."

This is a structural problem, not a data problem. Drivers are coupled 1:1 to vehicles via `vehicles.assigned_driver_id`, which means:
- A driver can't be scheduled until someone edits a vehicle and assigns them
- A driver can only ever be tied to one vehicle
- Day-to-day driver/vehicle swaps require editing vehicle records

### The fix — add a real driver picker to scheduling

Decouple driver selection from vehicle selection. Let dispatchers pick **any active driver** in the org when scheduling a pickup, independent of which vehicle they're using that day.

**Files to change:**

1. **`src/components/SchedulePickupDialog.tsx`**
   - Add a `useDrivers()` call (already exists in `src/hooks/useDrivers.ts` and already returns the right list — confirmed Khiyron and Moses would both appear).
   - Add a "Driver" `<Select>` field below the truck selector, defaulting to the vehicle's `assigned_driver_id` if one exists, but always editable.
   - Pass the chosen `driverId` into the `useSchedulePickup` mutation instead of deriving it from the vehicle.

2. **`src/components/SchedulePickupWithDriverDialog.tsx`**
   - Same change: add an explicit driver `<Select>`, remove the "Selected vehicle does not have an assigned driver" error, and let the user pick any active driver.

3. **`src/hooks/useDrivers.ts`** — no change needed. It already filters by org + `role='driver'` + `is_active=true`, which correctly returns Khiyron, Moses, Gonzalo, Solo, etc.

4. **No DB migration needed.** `assignments.driver_id` already exists and is already what the mutation writes to.

### Technical notes

- The `useDrivers` hook joins `users` → `user_organization_roles` filtered by `role='driver'` and current org. I verified it would return both Khiyron (he has both `driver` and `dispatcher` rows — the `driver` row matches) and Moses.
- `useSchedulePickupWithDriver` already accepts `driverId` and writes it to `assignments.driver_id` — we just need the UI to let the user pick it.
- After this fix, the existing "assign driver to vehicle" feature in vehicle management still works as a *default*, but it's no longer a *gate*.

### Quick unblock right now (no code change)

If you need to schedule Khiyron or Moses today before the fix ships, go to **Vehicle Management** and set them as the `assigned_driver_id` on any active truck. They'll then appear when you pick that truck in the schedule dialog.

