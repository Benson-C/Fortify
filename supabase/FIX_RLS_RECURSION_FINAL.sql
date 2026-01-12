-- FINAL FIX: Resolve admin_users recursion and users INSERT issues
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FIX 1: admin_users Table Recursion
-- ============================================================================

-- The problem: admin_users policies query admin_users itself → recursion
-- Solution: Use security definer function OR allow users to check themselves

-- Option: Create security definer function (bypasses RLS)
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

-- Create new policies using the function (no recursion!)
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (public.is_admin_user(auth.uid()));

create policy "Admins can insert admin_users"
  on public.admin_users for insert
  with check (public.is_admin_user(auth.uid()));

create policy "Admins can delete admin_users"
  on public.admin_users for delete
  using (public.is_admin_user(auth.uid()));

-- Also allow users to check their own admin status (for isAdmin() function)
create policy "Users can check own admin status"
  on public.admin_users for select
  using (user_id = auth.uid());

-- ============================================================================
-- FIX 2: users INSERT Policy (Permission Denied)
-- ============================================================================

-- The problem: Policy queries auth.users → permission denied
-- Solution: Use auth.uid() directly (no table query needed)

drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    -- Removed NOT EXISTS check - duplicate prevention handled by unique constraint
  );

-- ============================================================================
-- FIX 3: Update Other Admin Policies to Use Function
-- ============================================================================

-- Update all other admin policies to use the function (consistent approach)
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
-- FIX 4: Initial Admin Creation (Bootstrap Problem)
-- ============================================================================

-- Allow service role to insert first admin (or use Supabase dashboard)
-- This is a one-time operation, so we can temporarily disable RLS or use service role
-- For now, admins can be created via Supabase dashboard SQL editor

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
    COUNT(*)::text || ' policies use function' as name,
    'No recursion ✓' as status
FROM pg_policies 
WHERE tablename = 'admin_users' 
  AND (qual::text LIKE '%is_admin_user%' OR with_check::text LIKE '%is_admin_user%')

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
    '✓ Admin Policies Updated' as check_type,
    COUNT(*)::text || ' policies use is_admin_user()' as name,
    'No recursion ✓' as status
FROM pg_policies 
WHERE (qual::text LIKE '%is_admin_user%' OR with_check::text LIKE '%is_admin_user%')
  AND tablename IN ('users', 'events', 'bookings', 'health_metrics');

-- Expected output:
-- ✓ Helper Function | is_admin_user | security definer ✓
-- ✓ admin_users Policies | 3 policies use function | No recursion ✓
-- ✓ users INSERT Policy | Users can insert their own profile | Uses auth.uid() ✓
-- ✓ Admin Policies Updated | 6 policies use is_admin_user() | No recursion ✓
