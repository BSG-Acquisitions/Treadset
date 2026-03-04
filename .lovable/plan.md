

## Why Your Notification Center Is Empty

There are **duplicate user records** for your account (zachdevon@bsgtires.com). You have 4 entries in the `users` table — the key conflict:

- **User `1c39d6ae`** — This is the one the app loads (has `auth_user_id` set). The notification query uses this ID.
- **User `70c2f0d6`** — A duplicate record with no `auth_user_id`. All **29,512 notifications** are stored under this ID.

The app queries `WHERE user_id = '1c39d6ae...'` but all notifications were written to `user_id = '70c2f0d6...'`. Result: empty notification center.

## Plan

### Step 1: Migrate notifications to the correct user ID
Run a SQL migration to reassign all notifications from the orphan user ID to the active one:
```sql
UPDATE notifications 
SET user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee' 
WHERE user_id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d';
```

### Step 2: Clean up duplicate user_organization_roles
Remove the org roles for the orphan user ID so edge functions don't keep writing to it:
```sql
DELETE FROM user_organization_roles 
WHERE user_id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d';
```

### Step 3: Clean up duplicate user records
Remove or deactivate the orphan user records (the ones without `auth_user_id`) to prevent this from recurring:
```sql
DELETE FROM users 
WHERE email = 'zachdevon@bsgtires.com' 
AND auth_user_id IS NULL;
```

Also delete user `676a2f69` (which has a different auth_user_id `346511c7` — likely an old login) if it's no longer active.

### Result
After this cleanup, your 29,512 notifications will appear in the notification center immediately, and future edge function notifications will be written to the correct user ID.

