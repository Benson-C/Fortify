# Fixing "new row violates row-level security policy" Error

## What This Error Means

**Error Message:**
```
Account created but profile setup failed: new row violates row-level security policy for table "users". Please contact support.
```

**⚠️ IMPORTANT: If you're also seeing "infinite recursion detected in policy" errors, fix that FIRST!**
- See `documentation/FIX_INFINITE_RECURSION.md`
- Run `supabase/fix_infinite_recursion.sql` before this fix
- The infinite recursion prevents ALL RLS policies from working

**What's Happening:**
1. ✅ User account is created in `auth.users` (authentication succeeds)
2. ❌ Database trigger fails to create profile in `public.users`
3. ❌ Fallback code tries to manually insert profile, but RLS policy blocks it

## Why This Happens

### The Problem

When a user registers:
1. Supabase creates the user in `auth.users`
2. A database trigger (`on_auth_user_created`) should automatically create a profile in `public.users`
3. The trigger function uses `security definer` which should bypass RLS
4. **BUT** if the trigger fails or doesn't run, your app tries a fallback:
   - It attempts to insert the profile directly from the client
   - This client-side insert is **subject to RLS policies**
   - The RLS policy requires `auth.uid() = id`, but there might be a timing issue where the session isn't fully established yet

### Root Causes

1. **Trigger not running** - The trigger might not be set up correctly
2. **Trigger failing silently** - The trigger runs but encounters an error
3. **RLS policy too strict** - The fallback insert is blocked by RLS
4. **Session timing** - `auth.uid()` isn't available when the fallback tries to insert

## Step-by-Step Fix

### Step 1: Verify the Trigger Exists and Works

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Check if trigger function exists
SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Should return 1 row with:
-- function_name: handle_new_user
-- is_security_definer: true (CRITICAL - must be true!)
```

**If it doesn't exist or `is_security_definer` is false**, run this:

```sql
-- Recreate the trigger function with security definer
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
  return new;
end;
$$ language plpgsql security definer;  -- ← CRITICAL: security definer bypasses RLS

-- Check if trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- If trigger doesn't exist, create it:
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Step 2: Check RLS Policies

Verify the INSERT policy exists:

```sql
-- Check RLS policies on users table
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';
```

**You should see a policy like:**
```
policyname: "Users can insert their own profile"
command: INSERT
with_check_expression: (auth.uid() = id)
```

**If it doesn't exist**, create it:

```sql
create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);
```

### Step 3: Fix the RLS Policy for Initial Registration

The issue is that when the fallback code runs, the RLS policy might be too strict. We need to make it work even if the trigger fails.

**Option A: Make the INSERT policy more permissive (Recommended)**

Update the policy to allow inserts when the user is authenticated and the ID matches:

```sql
-- Drop the old policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Create a more permissive policy
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() = id 
    AND auth.uid() IS NOT NULL
  );
```

**Option B: Add a policy that allows inserts during registration (Better)**

This allows the trigger OR the fallback to work:

```sql
-- Keep the existing policy for normal inserts
-- (It should already exist from schema.sql)

-- Add an additional policy that allows inserts if user doesn't exist yet
-- This helps with the fallback scenario
create policy "Allow profile creation during registration"
  on public.users for insert
  with check (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );
```

**Actually, the best fix is to ensure the trigger works, but we can also improve the fallback.**

### Step 4: Check Supabase Logs

1. Go to **Supabase Dashboard → Logs → Postgres Logs**
2. Filter by the time when you tried to register
3. Look for errors related to:
   - `handle_new_user`
   - `on_auth_user_created`
   - `users` table
   - RLS policy violations

**Common errors you might see:**
```
ERROR: null value in column "name" violates not-null constraint
ERROR: duplicate key value violates unique constraint
ERROR: permission denied for table users
```

### Step 5: Test the Trigger Manually

Test if the trigger would work by simulating a user creation:

```sql
-- First, check what the trigger function does
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- The function should insert into public.users
-- If you see errors, the function might have issues
```

## Complete Fix Script

Run this complete script in **Supabase SQL Editor** to fix everything:

```sql
-- Step 1: Ensure the trigger function exists with security definer
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
  return new;
exception
  when others then
    -- Log the error (you can check Supabase logs)
    raise warning 'Error in handle_new_user: %', SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

-- Step 2: Ensure the trigger exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 3: Ensure RLS INSERT policy exists
drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Step 4: Verify everything is set up
SELECT 
    'Trigger Function' as check_type,
    proname as name,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user'

UNION ALL

SELECT 
    'Trigger' as check_type,
    tgname as name,
    tgenabled as is_enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'

UNION ALL

SELECT 
    'RLS Policy' as check_type,
    policyname as name,
    NULL as is_enabled
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';
```

## After Running the Fix

1. **Try registering again** - The trigger should now work
2. **If it still fails**, check:
   - Browser console (F12) for detailed error messages
   - Supabase Postgres Logs for database errors
   - Verify the user exists in `auth.users` but not in `public.users`

## Why the Trigger Should Work

The trigger function uses `security definer`, which means:
- It runs with the permissions of the function owner (usually a superuser)
- It **bypasses RLS policies** completely
- It should always be able to insert into `public.users`

**If the trigger still fails**, the issue is likely:
1. Missing required fields (name is empty)
2. Data type mismatch
3. Constraint violation (duplicate email)
4. The trigger isn't actually running

## Alternative: Improve the Fallback Code

If the trigger can't be fixed, we can improve the fallback code in the app to handle RLS better. But the trigger should be the primary solution.

## Prevention

To prevent this in the future:
1. Always run `schema.sql` completely when setting up a new Supabase project
2. Verify triggers exist after running schema
3. Test registration immediately after setup
4. Monitor Supabase logs for trigger errors
