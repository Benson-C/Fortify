# Fixing Status 500 "Database error saving new user"

## What Status 500 Means

A **500 Internal Server Error** means:
- ✅ Your request reached Supabase
- ✅ Authentication succeeded (user created in `auth.users`)
- ❌ **Database operation failed** (trigger or insert failed)

This is a **server-side error**, not a client configuration issue.

## The Error You're Seeing

```json
{
    "code": "unexpected_failure",
    "message": "Database error saving new user"
}
```

This is Supabase's generic error when the database trigger fails silently or encounters an unexpected error.

## Step-by-Step Diagnosis

### Step 1: Check Supabase Postgres Logs (Most Important!)

1. Go to **Supabase Dashboard → Logs → Postgres Logs**
2. Filter by the time when you attempted registration
3. Look for:
   - **ERROR** messages
   - **Trigger execution errors**
   - **SQL errors**
   - **Constraint violations**

**What to look for:**
```
ERROR: null value in column "name" violates not-null constraint
ERROR: duplicate key value violates unique constraint "users_email_key"
ERROR: function handle_new_user() does not exist
ERROR: permission denied for table users
```

### Step 2: Check if User Was Created

1. Go to **Authentication → Users**
2. Check if the user exists
   - ✅ User exists = Auth succeeded, trigger failed
   - ❌ User doesn't exist = Auth failed (different issue)

3. Go to **Table Editor → `public.users`**
   - ❌ Profile missing = Trigger definitely failed

### Step 3: Test the Trigger Function Directly

Run this in **Supabase SQL Editor** to test the trigger:

```sql
-- Check if trigger function exists and is correct
SELECT 
    proname as function_name,
    prosrc as function_body,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Should return 1 row with:
-- function_name: handle_new_user
-- is_security_definer: true (critical!)
```

### Step 4: Check Trigger Status

```sql
-- Check if trigger exists and is enabled
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    tgisinternal as is_internal
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Should return:
-- trigger_name: on_auth_user_created
-- table_name: auth.users
-- enabled: 'O' (O = enabled, D = disabled)
```

### Step 5: Test Trigger Manually

Create a test user to see the exact error:

```sql
-- This will trigger the handle_new_user function
-- Replace with test values
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('testpassword', gen_salt('bf')),
    now(),
    '{"name": "Test User", "phone_number": "", "id_number": ""}'::jsonb
);
```

**Watch for errors** - this will show you exactly what's failing.

## Common Causes & Fixes

### Cause 1: Trigger Function Missing `security definer`

**Symptoms:**
- Error: "permission denied for table users"
- Trigger exists but can't insert

**Fix:**
```sql
-- Recreate function with security definer
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
$$ language plpgsql security definer;  -- ← This is critical!
```

### Cause 2: Trigger Not Enabled

**Symptoms:**
- Trigger exists but doesn't fire
- No errors in logs

**Fix:**
```sql
-- Enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Verify it's enabled
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- Should show: tgenabled = 'O'
```

### Cause 3: Missing Required Field (name is empty)

**Symptoms:**
- Error: "null value in column 'name' violates not-null constraint"
- User registered without name

**Fix:**
The trigger should handle this, but verify:
```sql
-- Check if name is being extracted correctly
SELECT 
    coalesce('{"name": ""}'::jsonb->>'name', '') as name_test;
-- Should return empty string, not null
```

**If name is required and empty, the trigger will fail.** Make sure registration form always sends a name.

### Cause 4: Duplicate Email

**Symptoms:**
- Error: "duplicate key value violates unique constraint 'users_email_key'"
- Email already exists in `public.users`

**Fix:**
```sql
-- Check for duplicate
SELECT email FROM public.users WHERE email = 'your-email@example.com';

-- If exists, either:
-- 1. Delete the old user
-- 2. Use a different email
```

### Cause 5: RLS Policy Blocking (Even with security definer)

**Symptoms:**
- Error: "new row violates row-level security policy"
- Rare, but can happen if RLS is misconfigured

**Fix:**
```sql
-- Temporarily disable RLS to test (NOT for production!)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Test registration
-- If it works, RLS is the issue

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Fix: Ensure trigger function has security definer
-- (security definer should bypass RLS, but verify)
```

### Cause 6: Invalid Enum Value

**Symptoms:**
- Error: "invalid input value for enum user_role"
- Role value doesn't match enum

**Fix:**
The trigger uses `coalesce` with default 'participant', so this shouldn't happen unless metadata has invalid role. Check:
```sql
-- Verify enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype;
-- Should show: participant, admin
```

## Quick Fix: Recreate Everything

If you're still stuck, recreate the trigger function and trigger:

```sql
-- 1. Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recreate function (with improved null handling)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Unknown'),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
  return new;
exception
  when others then
    -- Log the error (check Postgres logs)
    raise warning 'Error in handle_new_user: %', SQLERRM;
    raise;
end;
$$ language plpgsql security definer;

-- 4. Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Verify
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Debugging Checklist

- [ ] Check Supabase Postgres Logs for specific error
- [ ] Verify user exists in `auth.users` table
- [ ] Verify profile does NOT exist in `public.users` table
- [ ] Check trigger function exists and has `security definer`
- [ ] Check trigger is enabled (`tgenabled = 'O'`)
- [ ] Test trigger manually with INSERT statement
- [ ] Verify RLS policies exist (though security definer should bypass)
- [ ] Check for duplicate emails
- [ ] Verify name field is not empty in registration

## Next Steps

1. **Check Postgres Logs first** - This will show the exact error
2. **Run the verification queries** above
3. **Test the trigger manually** to see the exact failure
4. **Share the specific error** from Postgres logs for targeted help

The Postgres logs will tell you exactly what's failing. That's your best source of information!
