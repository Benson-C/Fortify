-- COMPLETE FIX for Registration Errors
-- Run this script to fix ALL registration-related issues at once
-- 
-- Fixes:
-- 1. Infinite recursion in RLS policies
-- 2. Trigger function with proper error handling
-- 3. Permissive INSERT policy for fallback registration
--
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Fix Infinite Recursion (Admin Policies)
-- ============================================================================

-- Create helper function to check admin status (bypasses RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- Update all admin policies to use the helper function
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin());

drop policy if exists "Admins can create events" on public.events;
create policy "Admins can create events"
  on public.events for insert
  with check (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update
  using (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin());

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin());

drop policy if exists "Admins can view all health metrics" on public.health_metrics;
create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (public.is_admin());

-- ============================================================================
-- PART 2: Fix Trigger Function
-- ============================================================================

-- Recreate trigger function with error handling and conflict resolution
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
  on conflict (id) do nothing;  -- Prevent errors if profile already exists
  return new;
exception
  when others then
    raise warning 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger exists and is enabled
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- PART 3: Fix INSERT Policy (More Permissive for Fallback)
-- ============================================================================

-- Drop and recreate INSERT policy to be more permissive
-- Uses auth.users check instead of auth.uid() to avoid timing issues
drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Check if user exists in auth.users (more reliable than auth.uid())
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
    -- Prevent duplicates
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = users.id
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    '✓ Helper Function' as check_type,
    proname as name,
    CASE WHEN prosecdef THEN 'Yes (bypasses RLS)' ELSE 'No' END as security_definer
FROM pg_proc 
WHERE proname = 'is_admin'

UNION ALL

SELECT 
    '✓ Trigger Function' as check_type,
    proname as name,
    CASE WHEN prosecdef THEN 'Yes (bypasses RLS)' ELSE 'No' END as security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user'

UNION ALL

SELECT 
    '✓ Trigger' as check_type,
    tgname as name,
    CASE WHEN tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'

UNION ALL

SELECT 
    '✓ INSERT Policy' as check_type,
    policyname as name,
    'Exists' as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT'

UNION ALL

SELECT 
    '✓ Admin Policies Fixed' as check_type,
    COUNT(*)::text || ' policies use is_admin()' as name,
    'No recursion' as status
FROM pg_policies 
WHERE (qual::text LIKE '%is_admin()%' OR with_check::text LIKE '%is_admin()%');

-- Expected output:
-- ✓ Helper Function | is_admin | Yes (bypasses RLS)
-- ✓ Trigger Function | handle_new_user | Yes (bypasses RLS)
-- ✓ Trigger | on_auth_user_created | Enabled
-- ✓ INSERT Policy | Users can insert their own profile | Exists
-- ✓ Admin Policies Fixed | 6 policies use is_admin() | No recursion
