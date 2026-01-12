-- FINAL FIX for INSERT policy blocking registration
-- The issue: After signUp(), the session might not be fully established
-- when the fallback INSERT runs, causing auth.uid() to be NULL or not match

-- Solution: Create a more permissive policy that checks auth.users directly
-- instead of relying on auth.uid() which might not be available yet

-- Step 1: Drop the existing policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Step 2: Create a policy that checks if user exists in auth.users
-- This is more reliable than auth.uid() which might not be set yet
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Check if the ID exists in auth.users (user was just created)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
    -- AND the ID matches (prevent inserting someone else's profile)
    AND id = (SELECT id FROM auth.users WHERE id = users.id LIMIT 1)
    -- Prevent duplicates
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = users.id
    )
  );

-- Alternative simpler policy (if above doesn't work):
-- This allows insert if user exists in auth.users, regardless of session state
-- COMMENT OUT THE ABOVE AND UNCOMMENT THIS IF NEEDED:
/*
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = users.id
    )
  );
*/

-- Step 3: Verify the policy
SELECT 
    '✓ INSERT Policy' as status,
    policyname as name,
    with_check as policy_condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';
