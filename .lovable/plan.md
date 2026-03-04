

## Mobile-Optimize Trailer Assignments for Jody

### Problems

The current layout has several mobile issues:

1. **Route card header** — The route name, date, badge, and "Start Route" button are in a single horizontal `flex justify-between` row. On a phone this overflows or crushes text. The badge and action button need to stack below the title.

2. **Progress bar area** — Has `pl-8` padding that wastes space on small screens.

3. **Stop cards** — The completed events badges (`flex-wrap gap-1`) and contact info can overflow. The collapsible content padding is too wide for mobile.

4. **GuidedStopEvents cards** — The `flex items-center justify-between` layout with label + "Complete" button works okay but could have larger touch targets.

5. **DriverStopEventActions grid** — Uses `grid-cols-2` which crampes button text on small screens. The dialog content (`max-w-md`) doesn't use mobile-friendly sizing.

6. **TrailerSignatureDialog** — The dialog uses `max-w-md` and has a fixed-height signature canvas (`h-32` / `128px`) which is tight on mobile. The form can get cut off by the keyboard.

7. **Page-level padding** — The outer `div` uses `p-6` which is too much on a phone.

8. **The `mobile.css` sticky button hack** — The global CSS makes ALL `button[type="submit"]` and `button[type="button"]` sticky with full width on mobile. This breaks button grids and inline buttons throughout the trailer workflow. This global rule needs to be scoped or removed.

### Changes

**1. `src/styles/mobile.css`** — Remove the aggressive global sticky button rule (lines ~139-148) that forces ALL buttons to be sticky full-width on mobile. This is the biggest offender — it breaks button grids, inline "Complete" buttons, dialog footer buttons, etc.

**2. `src/pages/DriverTrailerAssignments.tsx`**
- Reduce page padding: `p-6` → `p-3 sm:p-6`
- Reduce title size on mobile: `text-2xl` → `text-xl sm:text-2xl`
- **RouteCard header**: Stack the title/meta and badge/action vertically on mobile instead of side-by-side. Use `flex-col sm:flex-row` so the route name is on top, badge + button below.
- Reduce progress bar left padding on mobile
- Stop card padding: `p-4` → `p-3 sm:p-4`

**3. `src/components/trailers/GuidedStopEvents.tsx`**
- Make "Complete" / "Sign & Complete" buttons larger touch targets (`min-h-[44px]`)
- Ensure event cards have adequate padding for thumb taps

**4. `src/components/trailers/DriverStopEventActions.tsx`**
- Change grid to `grid-cols-1 sm:grid-cols-2` so buttons are full-width stacked on phone
- Dialog: add `max-h-[85vh] overflow-y-auto` for mobile scrollability

**5. `src/components/trailers/TrailerSignatureDialog.tsx`**
- Make dialog full-width on mobile: `max-w-md` → `sm:max-w-md w-full`
- Make dialog content scrollable: add `max-h-[85vh] overflow-y-auto`
- Increase signature canvas height on mobile for better finger signing
- Stack dialog footer buttons vertically on mobile

