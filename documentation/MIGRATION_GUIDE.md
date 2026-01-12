# Migration Guide: Role Field → Admin Users Table

This guide walks you through migrating from role-based admins to a separate admin_users table.

## Why Migrate?

**Current Problems:**
- ❌ Infinite recursion in RLS policies
- ❌ Need helper functions to bypass RLS
- ❌ Complex policy setup
- ❌ Role field on every user (even though 99% are participants)

**After Migration:**
- ✅ No recursion (admin_users is different table)
- ✅ Simpler RLS policies (direct table check)
- ✅ Better performance (small admin table)
- ✅ Cleaner user table (no role field)

## Migration Steps

### Step 1: Run the Migration SQL

1. Go to **Supabase Dashboard → SQL Editor**
2. Open: `supabase/MIGRATE_TO_ADMIN_TABLE.sql`
3. Copy and paste the entire contents
4. Click **"Run"**

This will:
- Create `admin_users` table
- Migrate existing admins
- Update all RLS policies
- Remove the `is_admin()` helper function

### Step 2: Update Application Code

#### Update `lib/auth.ts`

Replace the current `isAdmin()` function:

**Before:**
```typescript
export async function isAdmin(): Promise<boolean> {
  const { user } = await getUserProfile();
  return user?.role === 'admin';
}
```

**After:**
```typescript
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}
```

#### Update `lib/supabase/middleware.ts`

**Before:**
```typescript
const { data: userProfile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

const isAdmin = userProfile?.role === 'admin';
```

**After:**
```typescript
const { data: adminCheck } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();

const isAdmin = !!adminCheck;
```

#### Update `app/dashboard/page.tsx`

**Before:**
```typescript
if (user.role === 'admin') {
  redirect('/admin');
}
```

**After:**
```typescript
const { data: isAdmin } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();

if (isAdmin) {
  redirect('/admin');
}
```

### Step 3: Remove Role Field (Optional)

**Only do this after verifying everything works!**

1. Test registration, login, admin access
2. Verify all admin features work
3. Then run in SQL Editor:

```sql
-- Remove role column
alter table public.users drop column role;

-- Drop enum type
drop type user_role;
```

### Step 4: Update TypeScript Types

**Update `lib/auth.ts`:**

**Before:**
```typescript
export type UserRole = 'participant' | 'admin';

export interface UserProfile {
  // ...
  role: UserRole;
}
```

**After:**
```typescript
// Remove UserRole type
// Remove role from UserProfile interface

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone_number: string | null;
  id_number: string | null;
  // No role field!
}
```

## Managing Admins After Migration

### Add an Admin

**In Supabase SQL Editor:**
```sql
INSERT INTO public.admin_users (user_id, notes)
VALUES ('user-uuid-here', 'Added by admin');
```

**Or via your app (if you build an admin UI):**
```typescript
const { error } = await supabase
  .from('admin_users')
  .insert({ user_id: userId });
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

## Verification Checklist

After migration, verify:

- [ ] Registration works (creates user without role field)
- [ ] Login works
- [ ] Participants see `/dashboard`
- [ ] Admins see `/admin`
- [ ] Admin can view all users
- [ ] Admin can create/edit events
- [ ] Admin can view all bookings
- [ ] Admin can view all health metrics
- [ ] No infinite recursion errors
- [ ] No RLS policy errors

## Rollback Plan

If something goes wrong, you can rollback:

```sql
-- Re-add role field
alter table public.users 
add column role user_role default 'participant' not null;

-- Migrate admins back
update public.users 
set role = 'admin' 
where id in (select user_id from public.admin_users);

-- Recreate old policies (from schema.sql)
-- ... (restore from backup)
```

## Benefits Summary

1. **No Recursion**: Admin policies query `admin_users`, not `users`
2. **Simpler Code**: No helper functions needed
3. **Better Performance**: Small admin table, fast lookups
4. **Easier Management**: Clear admin list, audit trail (created_at)
5. **Cleaner Schema**: No role field on every user
