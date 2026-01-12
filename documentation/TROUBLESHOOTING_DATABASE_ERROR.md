# "Database error saving new user" - Troubleshooting Guide

## What This Error Means

The error "Database error saving new user" typically means:

1. **User was created in `auth.users`** (Supabase authentication succeeded)
2. **But the profile creation failed** in `public.users` table

This happens when:
- The database trigger `on_auth_user_created` fails to execute
- The trigger function `handle_new_user()` encounters an error
- Row Level Security (RLS) policies are blocking the insert
- Database constraints are violated (e.g., duplicate email, missing required fields)

## Where This Error Comes From

This error can appear from:
1. **Supabase's built-in error messages** - When the trigger fails
2. **Your application code** - When the fallback profile creation fails
3. **Database logs** - In Supabase Postgres logs

## Step-by-Step Diagnosis

### Step 1: Check Browser Console

Open Developer Tools (F12) → Console tab and look for:

```
[REGISTER] ✗ Failed to create user profile: {
  message: "...",
  details: "...",
  hint: "...",
  code: "..."
}
```

**Key fields to check:**
- `message` - The error description
- `code` - PostgreSQL error code (e.g., `23505` = unique violation, `23503` = foreign key violation)
- `hint` - Database suggestions for fixing
- `details` - Additional error context

### Step 2: Check Supabase Dashboard

1. **Authentication → Users**
   - ✅ User exists here = Auth succeeded
   - ❌ User doesn't exist = Auth failed (different issue)

2. **Table Editor → `public.users`**
   - ✅ Profile exists = Registration actually succeeded
   - ❌ Profile missing = Trigger/insert failed

### Step 3: Check Database Logs

1. Go to **Supabase Dashboard → Logs → Postgres Logs**
2. Filter by time when registration was attempted
3. Look for:
   - Trigger execution errors
   - SQL errors
   - RLS policy violations

### Step 4: Verify Database Schema

Run these queries in **Supabase SQL Editor**:

```sql
-- Check if trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';
```

## Common Causes & Solutions

### Cause 1: Trigger Not Set Up

**Symptoms:**
- User in `auth.users` but no profile in `public.users`
- No errors in logs (trigger just doesn't run)

**Solution:**
Run the schema SQL in Supabase SQL Editor:
```sql
-- From supabase/schema.sql, run the trigger creation:
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'id_number',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Cause 2: Missing RLS INSERT Policy

**Symptoms:**
- Error code: `42501` (insufficient privilege)
- Error message mentions "policy" or "permission"

**Solution:**
Add the INSERT policy:
```sql
create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);
```

### Cause 3: Duplicate Email Constraint

**Symptoms:**
- Error code: `23505` (unique violation)
- Error message: "duplicate key value violates unique constraint"

**Solution:**
- Check if email already exists in `public.users`
- Use a different email or delete the existing user

### Cause 4: Missing Required Field

**Symptoms:**
- Error code: `23502` (not null violation)
- Error message mentions a column name

**Solution:**
Check the trigger function - it should handle empty strings:
```sql
-- The trigger uses coalesce to handle nulls:
coalesce(new.raw_user_meta_data->>'name', '')
```

### Cause 5: Invalid Data Type

**Symptoms:**
- Error code: `22P02` (invalid input syntax)
- Error message mentions type conversion

**Solution:**
Check that:
- `name` is a string (not null/empty)
- `role` enum value is valid ('participant' or 'admin')
- All fields match their column types

### Cause 6: Foreign Key Constraint

**Symptoms:**
- Error code: `23503` (foreign key violation)
- Less common for user creation

**Solution:**
Verify the `id` matches the `auth.users.id` exactly

## Quick Fix: Manual Profile Creation

If the trigger fails, the registration code has a fallback that tries to create the profile manually. If that also fails, you can manually create it:

1. Get the user ID from `auth.users` table
2. Run this SQL:

```sql
INSERT INTO public.users (id, email, name, phone_number, id_number, role)
VALUES (
  'user-id-from-auth-users',
  'user@example.com',
  'User Name',
  NULL,
  NULL,
  'participant'
);
```

## Prevention: Verify Setup

Before registering users, verify:

1. ✅ Schema is applied (run `supabase/schema.sql`)
2. ✅ Trigger exists and is enabled
3. ✅ RLS INSERT policy exists
4. ✅ Function has `security definer` (bypasses RLS)

## Getting More Details

The registration code now logs detailed errors. Check browser console for:
- Full error object with all properties
- Step-by-step registration progress
- Specific failure point

If you see the error, copy the full error object from console and check:
- The `code` field (PostgreSQL error code)
- The `hint` field (database suggestions)
- The `details` field (additional context)
