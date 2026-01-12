-- EMERGENCY FIX: Most permissive INSERT policy possible
-- Use this if nothing else works
-- This allows any authenticated user to insert their own profile

-- Step 1: Drop existing policy
drop policy if exists "Users can insert their own profile" on public.users;

-- Step 2: Create ultra-permissive policy
-- This allows insert as long as:
-- 1. User is authenticated (has a session)
-- 2. The ID is not null
-- This should work immediately after signUp()
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Just check that ID is not null and user is authenticated
    id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- Step 3: If that still doesn't work, try this even simpler version:
-- (Only uncomment if the above fails)
/*
drop policy if exists "Users can insert their own profile" on public.users;

-- Minimal check: just that ID exists
create policy "Users can insert their own profile"
  on public.users for insert
  with check (id IS NOT NULL);
*/

-- Step 4: Also ensure trigger works (should bypass RLS)
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
    raise warning 'Error in handle_new_user: %', SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 5: Verify everything
SELECT 
    '✓ INSERT Policy' as check,
    policyname,
    'Created' as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT'

UNION ALL

SELECT 
    '✓ Trigger Function' as check,
    proname,
    CASE WHEN prosecdef THEN 'security definer' ELSE 'NOT security definer!' END
FROM pg_proc 
WHERE proname = 'handle_new_user'

UNION ALL

SELECT 
    '✓ Trigger' as check,
    tgname,
    CASE WHEN tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
