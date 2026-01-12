-- FINAL FIX for "permission denied for table users"
-- This error means RLS is completely blocking the INSERT
-- Likely causes: Policy doesn't exist, policy check fails, or can't access auth.users

-- ============================================================================
-- STEP 1: DIAGNOSE - Check current state
-- ============================================================================
SELECT 
    'DIAGNOSIS: Current INSERT Policies' as info,
    policyname,
    with_check as current_condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- ============================================================================
-- STEP 2: FIX - Drop and recreate with simplest possible policy
-- ============================================================================

-- Drop any existing policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Create the SIMPLEST possible policy that should work
-- This uses auth.uid() which should be available after session refresh
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Simple check: authenticated user inserting their own ID
    auth.uid() IS NOT NULL 
    AND id = auth.uid()
  );

-- ============================================================================
-- STEP 3: ALTERNATIVE - If above doesn't work, try this version
-- ============================================================================
-- This version doesn't check auth.users (which might have permission issues)
-- Just uncomment and run if the above still fails:

/*
drop policy if exists "Users can insert their own profile" on public.users;

-- Ultra-minimal: Just check ID is not null
-- WARNING: This is very permissive - only use if nothing else works
create policy "Users can insert their own profile"
  on public.users for insert
  with check (id IS NOT NULL);
*/

-- ============================================================================
-- STEP 4: VERIFY - Check what was created
-- ============================================================================
SELECT 
    '✓ Policy Status' as check_type,
    policyname,
    CASE 
      WHEN with_check IS NULL THEN '✗ No condition (might be too permissive)'
      ELSE '✓ Has condition: ' || with_check::text
    END as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- ============================================================================
-- STEP 5: Also ensure trigger is working (should bypass RLS)
-- ============================================================================
-- The trigger should create the profile automatically, bypassing RLS
-- If trigger works, fallback shouldn't be needed

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'Trigger error: %', SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

SELECT 
    '✓ Trigger Status' as check,
    'handle_new_user' as function,
    CASE WHEN prosecdef THEN 'security definer ✓' ELSE 'NOT security definer ✗' END as status
FROM pg_proc 
WHERE proname = 'handle_new_user';
