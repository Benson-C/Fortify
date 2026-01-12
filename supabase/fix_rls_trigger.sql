-- Fix for "new row violates row-level security policy" error
-- 
-- IMPORTANT: If you're also getting "infinite recursion" errors,
-- run fix_infinite_recursion.sql FIRST, then run this script.
--
-- Run this in Supabase SQL Editor if registration is failing

-- Step 1: Recreate the trigger function with proper error handling
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert the user profile
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
    -- Log the error for debugging
    raise warning 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    -- Still return new to allow auth.users creation to succeed
    -- The fallback code in the app will handle profile creation
    return new;
end;
$$ language plpgsql security definer;

-- Step 2: Ensure the trigger exists and is enabled
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 3: Ensure RLS INSERT policy exists (more permissive for fallback)
drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND NOT EXISTS (
      -- Prevent duplicate inserts (idempotency)
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );

-- Step 4: Verify setup
SELECT 
    '✓ Trigger Function' as status,
    proname as name,
    CASE WHEN prosecdef THEN 'Yes (bypasses RLS)' ELSE 'No (will fail!)' END as security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user'

UNION ALL

SELECT 
    '✓ Trigger' as status,
    tgname as name,
    CASE WHEN tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'

UNION ALL

SELECT 
    '✓ RLS Policy' as status,
    policyname as name,
    'Exists' as status
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- Expected output:
-- ✓ Trigger Function | handle_new_user | Yes (bypasses RLS)
-- ✓ Trigger          | on_auth_user_created | Enabled
-- ✓ RLS Policy       | Users can insert their own profile | Exists
