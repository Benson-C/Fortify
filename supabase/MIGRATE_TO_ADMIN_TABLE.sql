-- Migration: Switch from role-based to admin_users table
-- This eliminates infinite recursion issues and simplifies RLS policies
--
-- Benefits:
-- 1. No infinite recursion (admin_users is different table)
-- 2. Simpler RLS policies (no helper functions needed)
-- 3. Better performance (small admin table)
-- 4. Easier admin management
--
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create admin_users table
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.users(id),
  notes text
);

-- Index for fast lookups
create index if not exists idx_admin_users_user_id on public.admin_users(user_id);

-- Enable RLS on admin_users
alter table public.admin_users enable row level security;

-- RLS policy: Only admins can view admin_users (to see who is admin)
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- RLS policy: Only existing admins can add new admins
create policy "Admins can insert admin_users"
  on public.admin_users for insert
  with check (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- RLS policy: Only existing admins can remove admins
create policy "Admins can delete admin_users"
  on public.admin_users for delete
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- STEP 2: Migrate existing admins
-- ============================================================================

-- Insert all current admins into admin_users table
insert into public.admin_users (user_id, notes)
select id, 'Migrated from role field'
from public.users
where role = 'admin'
on conflict (user_id) do nothing;

-- ============================================================================
-- STEP 3: Update RLS policies to use admin_users instead of role
-- ============================================================================

-- Drop old admin policies
drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Admins can create events" on public.events;
drop policy if exists "Admins can update events" on public.events;
drop policy if exists "Admins can delete events" on public.events;
drop policy if exists "Admins can view all bookings" on public.bookings;
drop policy if exists "Admins can view all health metrics" on public.health_metrics;

-- Create new policies using admin_users table (NO RECURSION!)
create policy "Admins can view all users"
  on public.users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can create events"
  on public.events for insert
  with check (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can update events"
  on public.events for update
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can delete events"
  on public.events for delete
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can view all bookings"
  on public.bookings for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- STEP 4: Drop the is_admin() helper function (no longer needed!)
-- ============================================================================

drop function if exists public.is_admin();

-- ============================================================================
-- STEP 5: Verify migration
-- ============================================================================

SELECT 
    '✓ Admin Users Table' as check_type,
    COUNT(*)::text || ' admins migrated' as status
FROM public.admin_users

UNION ALL

SELECT 
    '✓ Admin Policies' as check_type,
    COUNT(*)::text || ' policies updated' as status
FROM pg_policies 
WHERE (qual::text LIKE '%admin_users%' OR with_check::text LIKE '%admin_users%')

UNION ALL

SELECT 
    '✓ Helper Function Removed' as check_type,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin')
      THEN 'Removed ✓'
      ELSE 'Still exists ✗'
    END as status;

-- ============================================================================
-- OPTIONAL: Remove role field (uncomment if you want to fully migrate)
-- ============================================================================

-- WARNING: Only do this after verifying everything works!
-- Uncomment the lines below to remove the role field entirely:

/*
-- Remove role column from users table
alter table public.users drop column role;

-- Drop the user_role enum type
drop type user_role;
*/

-- ============================================================================
-- How to add/remove admins after migration:
-- ============================================================================

-- Add admin:
-- INSERT INTO public.admin_users (user_id) VALUES ('user-uuid-here');

-- Remove admin:
-- DELETE FROM public.admin_users WHERE user_id = 'user-uuid-here';

-- List all admins:
-- SELECT u.id, u.email, u.name, a.created_at 
-- FROM public.admin_users a
-- JOIN public.users u ON u.id = a.user_id;
