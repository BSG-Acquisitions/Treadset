

# Move Navigation Items from "More" to User Menu

## What Changes

**User menu (upper-right person icon)** will contain:
- User info (name/email) -- already there
- Booking Requests (with badge) -- already there
- Service Zones -- already there
- Separator
- Manifests -- moving from More
- Receiver Signatures -- moving from More
- Separator
- Employees -- moving from More
- Haulers -- moving from More
- Receivers -- moving from More
- Separator
- Intelligence -- moving from More
- Integrations -- moving from More
- Settings -- moving from More
- Separator
- Sign out -- already there

**"More" dropdown in nav bar** will contain only:
- Drop-offs (the only item remaining)

Since "More" will have just one item, we could either keep it as a dropdown with one item, or convert it to a simple direct link to `/dropoffs` labeled "Drop-offs". A direct link makes more sense with a single item.

## Technical Details

**File:** `src/components/TopNav.tsx`

1. Move all items currently in the "More" dropdown (except Drop-offs) into the user menu dropdown, grouped with separators
2. Replace the "More" dropdown with a simple `<Link>` to `/dropoffs` (since it's now a single item, no dropdown needed)
3. Update the `getActiveSection()` function so `/dropoffs` gets its own active state instead of being under "more"
4. Keep all existing role checks (`hasAnyRole`) for each item as they are today

