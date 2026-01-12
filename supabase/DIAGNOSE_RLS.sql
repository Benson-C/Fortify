-- Diagnostic script to check current RLS setup
-- Run this to see what's currently configured and what might be wrong

-- ============================================================================
-- CHECK 1: Current INSERT Policy
-- ============================================================================
SELECT 
    'INSERT Policy Check' as check_type,
    policyname,
    cmd as command,
    with_check as policy_condition,
    CASE 
      WHEN with_check::text LIKE '%auth.uid() IS NOT NULL%' THEN '✓ Has NULL check'
      ELSE '✗ Missing NULL check'
    END as null_check,
    CASE 
      WHEN with_check::text LIKE '%NOT EXISTS%' THEN '✓ Has duplicate check'
      ELSE '✗ Missing duplicate check'
    END as duplicate_check
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- ============================================================================
-- CHECK 2: Trigger Function
-- ============================================================================
SELECT 
    'Trigger Function' as check_type,
    proname as function_name,
    CASE WHEN prosecdef THEN '✓ security definer (bypasses RLS)' 
         ELSE '✗ NOT security definer (will fail!)' 
    END as security_status,
    CASE WHEN prosrc LIKE '%on conflict%' THEN '✓ Has conflict handling'
         ELSE '✗ Missing conflict handling'
    END as conflict_handling
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- ============================================================================
-- CHECK 3: Trigger Status
-- ============================================================================
SELECT 
    'Trigger Status' as check_type,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE WHEN tgenabled = 'O' THEN '✓ Enabled'
         WHEN tgenabled = 'D' THEN '✗ Disabled'
         ELSE '? Unknown'
    END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- CHECK 4: Admin Helper Function (for recursion fix)
-- ============================================================================
SELECT 
    'Admin Helper Function' as check_type,
    proname as function_name,
    CASE WHEN prosecdef THEN '✓ security definer (bypasses RLS)' 
         ELSE '✗ NOT security definer' 
    END as security_status
FROM pg_proc 
WHERE proname = 'is_admin';

-- ============================================================================
-- CHECK 5: All Admin Policies (check for recursion)
-- ============================================================================
SELECT 
    'Admin Policies' as check_type,
    tablename,
    policyname,
    CASE 
      WHEN qual::text LIKE '%is_admin()%' OR with_check::text LIKE '%is_admin()%' 
      THEN '✓ Uses helper (no recursion)'
      WHEN qual::text LIKE '%public.users%' OR with_check::text LIKE '%public.users%'
      THEN '✗ Queries users table (will recurse!)'
      ELSE '? Unknown pattern'
    END as recursion_status
FROM pg_policies 
WHERE policyname LIKE '%Admin%' 
  AND (qual::text LIKE '%users%' OR with_check::text LIKE '%users%' OR qual::text LIKE '%is_admin%' OR with_check::text LIKE '%is_admin%');

-- ============================================================================
-- CHECK 6: RLS Enabled Status
-- ============================================================================
SELECT 
    'RLS Status' as check_type,
    schemaname || '.' || tablename as table_name,
    CASE WHEN rowsecurity THEN '✓ RLS Enabled'
         ELSE '✗ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
    'SUMMARY' as check_type,
    'Run COMPLETE_FIX.sql if any checks show ✗' as recommendation,
    'All checks should show ✓' as expected_result;
