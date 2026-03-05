

## Edit Scheduled Trailer Routes

You accidentally scheduled Jody's route for today instead of tomorrow. Currently there's no way to edit a route after creation — only delete and recreate. Let's add edit functionality.

### Changes

**1. `src/hooks/useTrailerRoutes.ts`** — The `useUpdateTrailerRoute` hook already exists and can update any fields on a route (date, driver, vehicle, notes). No changes needed here.

**2. `src/pages/TrailerRoutes.tsx`** — Add an "Edit" button on each route card (for `scheduled` and `draft` status routes). Clicking it opens a dialog with an edit form pre-populated with the route's current values (date, driver, vehicle, notes). Uses the existing `useUpdateTrailerRoute` mutation to save.

**3. New component: `src/components/trailers/EditTrailerRouteDialog.tsx`** — A dialog form that lets you change:
  - **Scheduled date** (calendar picker, pre-filled with current date)
  - **Driver** (dropdown, pre-filled)
  - **Vehicle** (dropdown, pre-filled)
  - **Notes** (textarea, pre-filled)
  
  Uses the existing `useUpdateTrailerRoute` hook to save. Keeps it simple — for stop editing, the detail page can be used.

This will let you quickly fix Jody's route date from today to tomorrow without having to delete and recreate it.

