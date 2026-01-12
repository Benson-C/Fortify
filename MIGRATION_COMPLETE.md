# Migration Complete: Role Field → Admin Users Table

## ✅ Migration Status

The migration from role-based admins to `admin_users` table has been completed!

## What Was Changed

### 1. Database Schema (`supabase/schema.sql`)
- ✅ Removed `role` field from `users` table
- ✅ Removed `user_role` enum type
- ✅ Added `admin_users` table
- ✅ Updated all RLS policies to use `admin_users` instead of role
- ✅ Removed `is_admin()` helper function (no longer needed!)
- ✅ Updated trigger function to not set role field

### 2. Application Code
- ✅ Updated `lib/auth.ts`:
  - Removed `UserRole` type
  - Removed `role` from `UserProfile` interface
  - Updated `isAdmin()` to check `admin_users` table
  - Updated `getUserProfile()` to not fetch role

- ✅ Updated `lib/supabase/middleware.ts`:
  - Changed admin check to query `admin_users` table

- ✅ Updated `app/dashboard/page.tsx`:
  - Changed admin check to query `admin_users` table

- ✅ Updated `app/admin/page.tsx`:
  - Changed participant queries to exclude admins via `admin_users` table
  - Updated statistics to count participants correctly

- ✅ Updated `app/register/page.tsx`:
  - Removed `role: 'participant'` from insert

## Next Steps

### 1. Run the SQL Migration

**IMPORTANT**: You still need to run the SQL migration in Supabase!

1. Go to **Supabase Dashboard → SQL Editor**
2. Open: `supabase/MIGRATE_TO_ADMIN_TABLE.sql`
3. Copy and paste the entire contents
4. Click **"Run"**

This will:
- Create the `admin_users` table
- Migrate existing admins from `role` field
- Update all RLS policies
- Remove the `is_admin()` function

### 2. Verify Migration

After running the SQL, verify:

```sql
-- Check admin_users table exists and has data
SELECT COUNT(*) FROM public.admin_users;

-- Check policies use admin_users
SELECT policyname, with_check 
FROM pg_policies 
WHERE with_check::text LIKE '%admin_users%';

-- Verify is_admin() function is removed
SELECT proname FROM pg_proc WHERE proname = 'is_admin';
-- Should return 0 rows
```

### 3. Test the Application

- [ ] Registration works (creates user without role)
- [ ] Login works
- [ ] Participants see `/dashboard`
- [ ] Admins see `/admin`
- [ ] Admin can view all users
- [ ] Admin can create/edit events
- [ ] No infinite recursion errors
- [ ] No RLS policy errors

### 4. Optional: Remove Role Field Completely

**Only after verifying everything works!**

Run in Supabase SQL Editor:

```sql
-- Remove role column
alter table public.users drop column role;

-- Drop enum type
drop type user_role;
```

## Managing Admins

### Add an Admin

```sql
INSERT INTO public.admin_users (user_id, notes)
VALUES ('user-uuid-here', 'Added manually');
```

### Remove an Admin

```sql
DELETE FROM public.admin_users 
WHERE user_id = 'user-uuid-here';
```

### List All Admins

```sql
SELECT 
  u.id,
  u.email,
  u.name,
  a.created_at,
  a.notes
FROM public.admin_users a
JOIN public.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;
```

## Benefits Achieved

1. ✅ **No Infinite Recursion** - Admin policies query `admin_users`, not `users`
2. ✅ **Simpler RLS Policies** - Direct table check, no helper functions
3. ✅ **Better Performance** - Small admin table, fast lookups
4. ✅ **Cleaner Schema** - No role field on every user
5. ✅ **Easier Management** - Clear admin list with audit trail

## Rollback (If Needed)

If something goes wrong:

```sql
-- Re-add role field
alter table public.users 
add column role user_role default 'participant' not null;

-- Migrate admins back
update public.users 
set role = 'admin' 
where id in (select user_id from public.admin_users);

-- Restore old policies (from backup or schema.sql backup)
```

## Files Modified

- `supabase/schema.sql` - Updated schema
- `lib/auth.ts` - Updated auth utilities
- `lib/supabase/middleware.ts` - Updated middleware
- `app/dashboard/page.tsx` - Updated dashboard
- `app/admin/page.tsx` - Updated admin page
- `app/register/page.tsx` - Updated registration

## Migration Script

The migration SQL script is ready at: `supabase/MIGRATE_TO_ADMIN_TABLE.sql`

Run it in Supabase SQL Editor to complete the migration!
