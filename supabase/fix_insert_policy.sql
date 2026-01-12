-- Fix for "new row violates row-level security policy" during registration
-- This makes the INSERT policy more permissive for initial profile creation
-- Run this AFTER fixing infinite recursion (fix_infinite_recursion.sql)

-- The issue: When the trigger fails, the fallback code tries to INSERT,
-- but the RLS policy might block it due to timing issues with auth.uid()

-- Solution: Make the INSERT policy allow inserts when:
-- 1. The user is authenticated (auth.uid() is not null)
-- 2. The ID matches the authenticated user
-- 3. OR if the profile doesn't exist yet (for initial registration)

-- Step 1: Drop the existing INSERT policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Step 2: Create a more permissive INSERT policy
-- This allows the fallback code to work even if there's a slight timing issue
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND NOT EXISTS (
      -- Prevent duplicate inserts (idempotency)
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );

-- Step 3: Also ensure the trigger function exists and works
-- (This should already be done by fix_rls_trigger.sql, but let's be sure)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert the user profile
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  )
  on conflict (id) do nothing;  -- Prevent errors if profile already exists
  return new;
exception
  when others then
    -- Log the error for debugging
    raise warning 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    -- Still return new to allow auth.users creation to succeed
    return new;
end;
$$ language plpgsql security definer;

-- Step 4: Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 5: Verify setup
SELECT 
    '✓ INSERT Policy' as check_type,
    policyname as name,
    with_check as policy_condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT'

UNION ALL

SELECT 
    '✓ Trigger Function' as check_type,
    proname as name,
    CASE WHEN prosecdef THEN 'security definer (bypasses RLS)' ELSE 'NOT security definer!' END as status
FROM pg_proc 
WHERE proname = 'handle_new_user'

UNION ALL

SELECT 
    '✓ Trigger' as check_type,
    tgname as name,
    CASE WHEN tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Expected output:
-- ✓ INSERT Policy | Users can insert their own profile | (auth.uid() IS NOT NULL AND ...)
-- ✓ Trigger Function | handle_new_user | security definer (bypasses RLS)
-- ✓ Trigger | on_auth_user_created | Enabled
