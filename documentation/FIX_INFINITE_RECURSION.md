# Fixing "infinite recursion detected in policy" Error

## What This Error Means

**Error Message:**
```
infinite recursion detected in policy for relation "users"
```

**What's Happening:**
1. An RLS policy on the `users` table tries to check if a user is an admin
2. To check if they're an admin, it queries the `users` table
3. That query triggers the RLS policy check again
4. Which queries the `users` table again
5. Which triggers the policy again...
6. **Infinite loop!** 🔄

## Why This Happens

The problematic policy looks like this:

```sql
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users  -- ← This queries users table
      where id = auth.uid() and role = 'admin'
    )
  );
```

**The Problem:**
- When checking if someone can view users, it queries `public.users`
- But querying `public.users` triggers RLS policy checks
- Which includes checking "Admins can view all users"
- Which queries `public.users` again...
- **Infinite recursion!**

## The Solution

Create a **security definer function** that bypasses RLS to check admin status. This function can query the users table without triggering RLS policies.

### Quick Fix

Run this script in **Supabase SQL Editor**:

**File:** `supabase/fix_infinite_recursion.sql`

This script:
1. Creates a `public.is_admin()` function with `security definer` (bypasses RLS)
2. Updates all admin policies to use this function instead of directly querying users
3. Prevents infinite recursion

### What the Fix Does

**Before (Causes Recursion):**
```sql
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users  -- ← Triggers RLS, causes recursion
      where id = auth.uid() and role = 'admin'
    )
  );
```

**After (No Recursion):**
```sql
-- Helper function (bypasses RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;  -- ← Bypasses RLS!

-- Policy uses the function
create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin());  -- ← No recursion!
```

## Step-by-Step Fix

### Step 1: Run the Fix Script

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the file: `supabase/fix_infinite_recursion.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**

### Step 2: Verify It Worked

After running, you should see output like:
```
✓ Helper Function | is_admin | Yes (bypasses RLS)
✓ Policy Fixed    | Admins can view all users | Uses is_admin() function
...
```

### Step 3: Test Registration

1. Try registering a new user
2. The infinite recursion error should be gone
3. If you still get "new row violates row-level security policy", run `fix_rls_trigger.sql` next

## Why This Works

**Security Definer Functions:**
- Run with the permissions of the function owner (usually a superuser)
- **Bypass Row Level Security (RLS) completely**
- Can query tables without triggering policy checks
- Perfect for helper functions that check permissions

**The `is_admin()` Function:**
- Uses `security definer` → bypasses RLS
- Queries `public.users` without triggering policies
- Returns `true` if current user is admin, `false` otherwise
- Policies can safely call this function without recursion

## Affected Policies

The fix updates these policies:
- ✅ `Admins can view all users` (users table)
- ✅ `Admins can create events` (events table)
- ✅ `Admins can update events` (events table)
- ✅ `Admins can delete events` (events table)
- ✅ `Admins can view all bookings` (bookings table)
- ✅ `Admins can view all health metrics` (health_metrics table)

## Related Errors

If you're seeing both errors:
1. **"infinite recursion detected"** → Run `fix_infinite_recursion.sql` FIRST
2. **"new row violates row-level security policy"** → Then run `fix_rls_trigger.sql`

The infinite recursion error prevents the INSERT policy from working, which causes the second error.

## Prevention

The updated `schema.sql` now includes the `is_admin()` helper function, so new setups won't have this issue. If you're setting up a fresh database, just run the complete `schema.sql` file.

## Technical Details

**Why `security definer`?**
- Without it, the function would still trigger RLS
- With it, the function runs with superuser permissions
- It can query `public.users` directly without policy checks

**Why `stable`?**
- Marks the function as stable (same inputs = same output)
- Allows PostgreSQL to optimize queries
- Safe because user role doesn't change during a transaction

**Security Note:**
- The function only checks if the current user (`auth.uid()`) is an admin
- It doesn't expose any data, just returns true/false
- Still secure because it only checks the authenticated user's own role
