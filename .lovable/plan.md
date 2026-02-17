

# Drag-and-Drop Pickups + Manifest Status in Weekly View

## Overview

Two enhancements to the Weekly Pickups Grid:

1. **Drag-and-drop pickups between days** -- drag a pickup card from one day column and drop it on another to move it, instead of using the click-based move dialog.
2. **Show manifest completion status** -- if a pickup has a signed/completed manifest, show a visual indicator (green badge) on the tile so dispatchers can see at a glance which stops are done.

## What Changes

### 1. Drag-and-Drop Between Day Columns

Each pickup card becomes `draggable`. When dragged over a different day column, that column highlights as a drop target. On drop, the `useMovePickup` mutation fires to update the pickup date and assignment date in the database.

- Pickup cards get `draggable` attribute, `onDragStart` sets the pickup ID and source date in `dataTransfer`
- Day columns get `onDragOver` (to allow drop + highlight) and `onDrop` (to trigger the move)
- A visual highlight (border color change) shows which column you're hovering over
- The existing click-to-move and menu "Move Pickup" options remain as fallbacks

### 2. Manifest Completion Badge on Pickup Tiles

The `usePickups` hook already fetches manifest data including `status`. The pickup card will check if any linked manifest has status `COMPLETED` or `AWAITING_RECEIVER_SIGNATURE` and display:

- A green "Completed" or amber "Signed" badge in the top-right area of the card
- A subtle green left-border on completed pickup cards for quick visual scanning

---

## Technical Details

### File: `src/components/routes/WeeklyPickupsGrid.tsx`

**Props change on `WeeklyPickupsGrid`:**
- No new props needed; `useMovePickup` hook is used internally in `DayColumn`

**Drag-and-drop implementation:**

On pickup cards:
```text
draggable={true}
onDragStart -> e.dataTransfer.setData('pickupId', pickup.id)
              e.dataTransfer.setData('sourceDate', dateStr)
```

On day column drop zone:
```text
onDragOver -> e.preventDefault(), set dragOver state for highlight
onDragLeave -> clear dragOver state
onDrop -> read pickupId from dataTransfer, call useMovePickup({ pickupId, newDate: dateStr })
```

**Manifest status display:**

For each pickup card, check `pickup.manifests` array:
```text
const completedManifest = pickup.manifests?.find(m => m.status === 'COMPLETED');
const signedManifest = pickup.manifests?.find(m => m.status === 'AWAITING_RECEIVER_SIGNATURE');
```

Display a Badge component:
- Green "Completed" badge if manifest status is COMPLETED
- Amber "Signed" badge if AWAITING_RECEIVER_SIGNATURE
- No badge otherwise

Add a green left border (`border-l-4 border-green-500`) to completed pickup cards for quick visual identification.

### Files Changed

| File | Change |
|------|--------|
| `src/components/routes/WeeklyPickupsGrid.tsx` | Add drag-and-drop handlers, manifest status badges, visual drop zone highlighting |

No database changes or new files needed -- the existing `useMovePickup` hook and manifest data from `usePickups` provide everything required.

