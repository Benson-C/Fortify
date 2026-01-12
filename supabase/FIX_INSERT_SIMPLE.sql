-- SIMPLE FIX: Most permissive INSERT policy
-- This checks if the user exists in auth.users (which they do after signUp)
-- Doesn't rely on auth.uid() which might not be available yet

drop policy if exists "Users can insert their own profile" on public.users;

-- Simple policy: If the ID exists in auth.users, allow insert
-- This works because after signUp(), the user definitely exists in auth.users
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
  );

-- Verify
SELECT 
    '✓ INSERT Policy Updated' as status,
    policyname,
    with_check as condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';
