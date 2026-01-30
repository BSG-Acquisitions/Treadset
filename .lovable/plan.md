

# Fix Password Reset Email Delivery

## Problem Identified
The password reset functionality is using Supabase's built-in `resetPasswordForEmail()` method, which relies on Supabase's default email system. This isn't working because:
1. Supabase's built-in emails may not be configured with a custom SMTP provider
2. The custom `send-password-reset` edge function (which uses Resend) is never called

The edge function logs are empty because the code completely bypasses it.

## Solution
Modify the `resetPassword` function in `AuthContext.tsx` to call your custom `send-password-reset` edge function instead of using Supabase's built-in method. This will route password reset emails through Resend where you can track deliverability.

## Implementation Steps

### Step 1: Update AuthContext.tsx - resetPassword Function
Replace the current implementation that uses `supabase.auth.resetPasswordForEmail()` with a call to the `send-password-reset` edge function.

**Current code (lines 421-432):**
```typescript
const resetPassword = async (email: string) => {
  const currentUrl = window.location.origin;
  const redirectUrl = `${currentUrl}/reset-password`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });
  return { error };
};
```

**New code:**
```typescript
const resetPassword = async (email: string) => {
  const currentUrl = window.location.origin;
  const resetUrl = `${currentUrl}/reset-password`;
  
  try {
    // First, trigger Supabase's password reset to generate the token
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl
    });
    
    if (supabaseError) {
      return { error: supabaseError };
    }
    
    // Then call our custom edge function to send the branded email via Resend
    const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
      body: {
        email,
        resetUrl,
        companyName: 'TreadSet'
      }
    });
    
    if (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Still return success since Supabase sent its email as backup
    }
    
    return { error: null };
  } catch (err) {
    console.error('Password reset error:', err);
    return { error: err };
  }
};
```

### Step 2: Update the Edge Function
The current edge function expects a `resetUrl` but doesn't include the actual token from Supabase. We need to update it to work as a custom email hook or modify the approach.

**Better approach:** Configure Supabase to use a custom email hook that calls your edge function. This ensures the token is properly included.

**File:** `supabase/functions/send-password-reset/index.ts`

Update the edge function to handle the Supabase auth webhook format:
- Add support for both direct calls and Supabase auth hook calls
- Update the email template branding from "BSG Tire Recycling" to "TreadSet"
- Ensure proper error handling and logging

### Step 3: Update Email Branding
The current edge function references "BSG Tire Recycling" - this needs to be updated to "TreadSet" branding for consistency.

## Technical Details

### Why Two Approaches?
1. **Hybrid approach** (recommended): Keep Supabase's `resetPasswordForEmail` to generate the secure token, then send a custom email via Resend. Supabase will still send its default email as a backup.

2. **Full custom hook** (more complex): Configure Supabase Auth to use a custom email hook that intercepts all auth emails. This requires configuring the hook in Supabase dashboard under Authentication → Hooks.

### Resend Configuration Check
The `RESEND_API_KEY` secret is already configured, which is good. Ensure:
- The sending domain is verified in Resend
- The `from` email address uses a verified domain

## Files to Modify
1. `src/contexts/AuthContext.tsx` - Update `resetPassword` function to call edge function
2. `supabase/functions/send-password-reset/index.ts` - Update branding and improve error handling

## Testing Plan
After implementation:
1. Attempt password reset for a test email
2. Check Resend dashboard for email delivery
3. Check edge function logs for any errors
4. Verify the reset link works correctly

