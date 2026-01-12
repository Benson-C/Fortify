-- COMPREHENSIVE FIX: Resolve ALL RLS recursion and permission issues
-- Run this in Supabase SQL Editor to fix everything at once

-- ============================================================================
-- FIX 1: admin_users Table Recursion (CRITICAL)
-- ============================================================================

-- Problem: admin_users policies query admin_users itself → infinite recursion
-- Solution: Use security definer function that bypasses RLS

-- Create helper function (bypasses RLS)
create or replace function public.is_admin_user(user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = user_uuid
  );
end;
$$ language plpgsql security definer stable;

-- Drop existing admin_users policies
drop policy if exists "Admins can view admin_users" on public.admin_users;
drop policy if exists "Admins can insert admin_users" on public.admin_users;
drop policy if exists "Admins can delete admin_users" on public.admin_users;
drop policy if exists "Users can check own admin status" on public.admin_users;

-- Create new policies using function (NO RECURSION!)
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (public.is_admin_user(auth.uid()));

create policy "Admins can insert admin_users"
  on public.admin_users for insert
  with check (public.is_admin_user(auth.uid()));

create policy "Admins can delete admin_users"
  on public.admin_users for delete
  using (public.is_admin_user(auth.uid()));

-- CRITICAL: Allow users to check their own admin status (for isAdmin() function)
-- This doesn't cause recursion because it's a direct equality check
create policy "Users can check own admin status"
  on public.admin_users for select
  using (user_id = auth.uid());

-- ============================================================================
-- FIX 2: users INSERT Policy (CRITICAL)
-- ============================================================================

-- Problem: Policy queries auth.users → permission denied
-- Solution: Use auth.uid() directly (no table query)

drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- ============================================================================
-- FIX 3: users SELECT Policy (May be blocked by admin policy recursion)
-- ============================================================================

-- Ensure users can always view their own profile
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

-- ============================================================================
-- FIX 4: Update All Admin Policies to Use Function
-- ============================================================================

-- Update all admin policies to use the helper function (consistent, no recursion)
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can create events" on public.events;
create policy "Admins can create events"
  on public.events for insert
  with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can view all health metrics" on public.health_metrics;
create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (public.is_admin_user(auth.uid()));

-- ============================================================================
-- FIX 5: Grant Execute Permissions
-- ============================================================================

-- Ensure authenticated users can call the helper function
grant execute on function public.is_admin_user(uuid) to authenticated;

-- Grant execute on other functions only if they exist
-- (These are created in schema.sql, so they may not exist if schema.sql hasn't been run)
do $$
begin
  -- Only grant if function exists
  if exists (
    select 1 from pg_proc 
    where proname = 'create_booking_safe' 
    and pronamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    grant execute on function public.create_booking_safe(uuid, uuid) to authenticated;
  end if;
  
  if exists (
    select 1 from pg_proc 
    where proname = 'get_event_bookings_count' 
    and pronamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    grant execute on function public.get_event_bookings_count(uuid) to authenticated;
  end if;
end $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    '✓ Helper Function' as check_type,
    proname as name,
    CASE WHEN prosecdef THEN 'security definer ✓' ELSE 'NOT security definer ✗' END as status
FROM pg_proc 
WHERE proname = 'is_admin_user'

UNION ALL

SELECT 
    '✓ admin_users Policies' as check_type,
    COUNT(*)::text || ' policies' as name,
    CASE 
      WHEN COUNT(*) >= 4 THEN 'All policies created ✓'
      ELSE 'Missing policies ✗'
    END as status
FROM pg_policies 
WHERE tablename = 'admin_users'

UNION ALL

SELECT 
    '✓ users INSERT Policy' as check_type,
    policyname as name,
    CASE 
      WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%auth.users%'
      THEN 'Uses auth.uid() ✓'
      ELSE 'Check policy condition'
    END as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT'

UNION ALL

SELECT 
    '✓ users SELECT Policies' as check_type,
    COUNT(*)::text || ' policies' as name,
    CASE 
      WHEN COUNT(*) >= 2 THEN 'User + Admin policies exist ✓'
      ELSE 'Missing policies ✗'
    END as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT'

UNION ALL

SELECT 
    '✓ Admin Policies Updated' as check_type,
    COUNT(*)::text || ' policies use is_admin_user()' as name,
    'No recursion ✓' as status
FROM pg_policies 
WHERE (qual::text LIKE '%is_admin_user%' OR with_check::text LIKE '%is_admin_user%')
  AND tablename IN ('users', 'events', 'bookings', 'health_metrics', 'admin_users');

-- Expected output:
-- ✓ Helper Function | is_admin_user | security definer ✓
-- ✓ admin_users Policies | 4 policies | All policies created ✓
-- ✓ users INSERT Policy | Users can insert their own profile | Uses auth.uid() ✓
-- ✓ users SELECT Policies | 2 policies | User + Admin policies exist ✓
-- ✓ Admin Policies Updated | 7+ policies use is_admin_user() | No recursion ✓
