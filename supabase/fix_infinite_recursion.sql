-- Fix for "infinite recursion detected in policy for relation users" error
-- This error occurs because RLS policies query the users table, which triggers
-- the policy check again, causing infinite recursion.
--
-- Solution: Create a security definer function that bypasses RLS to check admin status
-- Run this in Supabase SQL Editor

-- Step 1: Create helper function to check admin status (bypasses RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- Step 2: Drop and recreate all admin policies to use the helper function
-- This prevents infinite recursion

-- Users table
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin());

-- Events table
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

-- Bookings table
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin());

-- Health Metrics table
drop policy if exists "Admins can view all health metrics" on public.health_metrics;
create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (public.is_admin());

-- Step 3: Verify the fix
SELECT 
    '✓ Helper Function' as status,
    proname as name,
    CASE WHEN prosecdef THEN 'Yes (bypasses RLS)' ELSE 'No' END as security_definer
FROM pg_proc 
WHERE proname = 'is_admin'

UNION ALL

SELECT 
    '✓ Policy Fixed' as status,
    policyname as name,
    'Uses is_admin() function' as status
FROM pg_policies 
WHERE tablename IN ('users', 'events', 'bookings', 'health_metrics')
  AND policyname LIKE '%Admin%';

-- Expected output:
-- ✓ Helper Function | is_admin | Yes (bypasses RLS)
-- ✓ Policy Fixed    | Admins can view all users | Uses is_admin() function
-- ✓ Policy Fixed    | Admins can create events | Uses is_admin() function
-- ... (and more admin policies)
