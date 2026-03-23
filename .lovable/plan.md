

## Get Kyle's Account Demo-Ready

Two data operations needed — no code changes required.

### 1. Confirm Kyle's email
Use the Supabase Auth admin API to confirm `kyle@granulum.ca` so he can log in immediately without clicking the confirmation email.

### 2. Complete onboarding data
Update Kyle's organization from "New Company" to "Granulum" and set the state code (likely MI based on your other clients, but can adjust). This is the same data the onboarding wizard would have saved.

**After this, Kyle can go to `app.treadset.co`, sign in with his email and password, and land in his fully set up org.**

### Technical details
- Confirm email: call Supabase admin `updateUserById` to set `email_confirmed_at` via the `confirm-user-email` pattern or direct admin API
- Update org: `UPDATE organizations SET name = 'Granulum' WHERE slug = 'kyle-85cc5d78'`
- Both are data-only operations (no code or schema changes)

