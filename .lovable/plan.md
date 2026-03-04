

## Plan: Simplify Trailer Route Creation Wizard

### What's wrong today

1. **Route Name** is required (`NOT NULL` in DB, only Step 1 validation gate) but adds no real value — the driver sees it but it's just friction for the dispatcher. It should auto-generate from the date (e.g., "Trailer Route — Mar 4, 2026").

2. **Assigned Vehicle** — useful but optional. Keep it, but make it clearly optional.

3. **Assigned Trailer** at the route level is confusing. The real trailer assignments happen per-stop in Step 3 (planned events). The route-level `trailer_id` is redundant and misleading — remove it from the wizard. The per-stop events already track which trailers go where.

4. **Notes** are saved to the DB but never shown on the driver's mobile view (`DriverTrailerAssignments.tsx`). They only appear on the dispatcher detail page. Need to surface them for the driver.

### Changes

#### 1. Remove Route Name field, auto-generate it
- **`TrailerRouteWizard.tsx`**: Remove the Route Name input. Auto-generate it as `"Trailer Route — {formatted date}"` on submit. Remove it from Step 1 validation (date is already required).
- **DB**: No schema change needed — `route_name` stays in the table, just auto-populated.

#### 2. Remove route-level Trailer assignment from wizard
- **`TrailerRouteWizard.tsx`**: Remove the "Assign Trailer" `<Select>` from Step 1. Stop passing `trailer_id` to `createRoute.mutateAsync()`.
- The per-stop trailer events in Step 3 already handle all trailer assignments — that's where it matters.

#### 3. Keep Vehicle and Driver as-is (both optional)
- Driver is already optional in the DB. Vehicle is already optional. No changes needed, just keep them.

#### 4. Surface notes on driver mobile view
- **`DriverTrailerAssignments.tsx`**: In the `RouteCard` component, display `route.notes` below the route metadata (date, vehicle) when present. Small muted text block so the driver can see dispatcher instructions.

#### 5. Keep notes field in wizard
- Notes field stays in the wizard — it works, it saves, it's useful for dispatcher-to-driver communication. Just wasn't visible to the driver until change #4.

### Files to edit
| File | Change |
|------|--------|
| `src/components/trailers/TrailerRouteWizard.tsx` | Remove route name input + trailer select; auto-generate name from date |
| `src/pages/DriverTrailerAssignments.tsx` | Display `route.notes` on the route card |

### Summary
The wizard goes from 6 fields (name, date, driver, vehicle, trailer, notes) to 4 fields (date, driver, vehicle, notes) — all intuitive. The route name auto-generates. Trailer assignments happen where they belong: at the per-stop level in Step 3.

