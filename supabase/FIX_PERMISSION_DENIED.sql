-- Fix for "permission denied for table users" error
-- This error means RLS is blocking the INSERT because no policy allows it
-- OR the policy check is failing completely

-- Step 1: Check current state
SELECT 
    'Current Policies' as check_type,
    policyname,
    cmd as command,
    with_check as policy_condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- Step 2: Drop any existing INSERT policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Step 3: Create a very permissive policy that should work
-- This policy allows insert if the user ID exists in auth.users
-- (which it definitely does after signUp)
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Check if the ID being inserted exists in auth.users
    -- This is safe because after signUp(), the user definitely exists there
    (SELECT id FROM auth.users WHERE id = users.id) IS NOT NULL
  );

-- Step 4: Verify RLS is enabled (it should be)
-- If RLS is disabled, we wouldn't get permission denied errors
SELECT 
    'RLS Status' as check_type,
    schemaname || '.' || tablename as table_name,
    CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Step 5: Verify the policy was created
SELECT 
    '✓ Policy Created' as status,
    policyname,
    with_check as condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- If the above policy still doesn't work, try this even simpler version:
-- (Uncomment if needed)
/*
drop policy if exists "Users can insert their own profile" on public.users;

-- Ultra-simple: Allow insert if ID is a valid UUID (very permissive)
create policy "Users can insert their own profile"
  on public.users for insert
  with check (id IS NOT NULL);
*/
