# Admin Architecture: Current vs. Simplified Approach

## Current Approach (Role-Based in Users Table)

**How it works:**
- Every user has a `role` field: `'participant'` or `'admin'`
- RLS policies check: "Is the current user an admin?"
- To check admin status, policies query the `users` table
- **Problem**: This causes infinite recursion!

**Current Schema:**
```sql
create type user_role as enum ('participant', 'admin');

create table public.users (
  id uuid primary key,
  email text,
  name text,
  role user_role default 'participant',  -- ← Role stored here
  ...
);
```

**Current RLS Policy (Causes Recursion):**
```sql
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users  -- ← Queries users table!
      where id = auth.uid() and role = 'admin'
    )
  );
```

**Problems:**
1. ❌ Infinite recursion (policy queries the table it protects)
2. ❌ Requires helper function workaround (`is_admin()`)
3. ❌ More complex RLS policies
4. ❌ Every user needs role field (even though 99% are participants)

---

## Simplified Approach (Separate Admin Table)

**How it works:**
- All users are equal by default (no role field)
- Admins are stored in a separate `admin_users` table
- RLS policies check: "Is the current user ID in the admin_users table?"
- **No recursion!** (admin_users is a different table)

**Simplified Schema:**
```sql
-- Users table (no role field!)
create table public.users (
  id uuid primary key,
  email text,
  name text,
  -- No role field!
  ...
);

-- Separate admin table
create table public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  created_by uuid references public.users(id)
);

-- Index for fast lookups
create index idx_admin_users_user_id on public.admin_users(user_id);
```

**Simplified RLS Policy (No Recursion!):**
```sql
create policy "Admins can view all users"
  on public.users for select
  using (
    EXISTS (
      SELECT 1 FROM public.admin_users  -- ← Different table, no recursion!
      WHERE user_id = auth.uid()
    )
  );
```

**Benefits:**
1. ✅ **No infinite recursion** (queries different table)
2. ✅ **Simpler RLS policies** (no helper functions needed)
3. ✅ **Better performance** (smaller admin_users table, faster lookups)
4. ✅ **Easier admin management** (just add/remove from admin_users)
5. ✅ **Cleaner user table** (no role field for 99% of users)
6. ✅ **More explicit** (clear who is admin, when they became admin)

---

## Comparison

| Aspect | Current (Role in Users) | Simplified (Admin Table) |
|--------|------------------------|--------------------------|
| **RLS Complexity** | Complex (needs helper function) | Simple (direct table check) |
| **Recursion Risk** | High (queries same table) | None (different table) |
| **Performance** | Slower (checks role on every user) | Faster (small admin table) |
| **Admin Management** | UPDATE users SET role='admin' | INSERT INTO admin_users |
| **Code Changes** | Minimal | Minimal (just check different table) |
| **Scalability** | Good | Better (admin table stays small) |

---

## Migration Path

If you want to switch to the simplified approach:

### Step 1: Create Admin Table
```sql
-- Create admin_users table
create table public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  created_by uuid references public.users(id)
);

create index idx_admin_users_user_id on public.admin_users(user_id);

-- Migrate existing admins
insert into public.admin_users (user_id)
select id from public.users where role = 'admin';
```

### Step 2: Update RLS Policies
```sql
-- Drop old admin policies
drop policy if exists "Admins can view all users" on public.users;
-- ... (drop all other admin policies)

-- Create new policies using admin_users table
create policy "Admins can view all users"
  on public.users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
```

### Step 3: Remove Role Field (Optional)
```sql
-- Remove role column (after migrating admins)
alter table public.users drop column role;
drop type user_role;
```

### Step 4: Update Application Code
```typescript
// OLD: Check role field
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single();
const isAdmin = user?.role === 'admin';

// NEW: Check admin_users table
const { data: admin } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', userId)
  .maybeSingle();
const isAdmin = !!admin;
```

---

## Recommendation

**YES, switch to the simplified approach!**

**Reasons:**
1. **Eliminates recursion** - The main problem you're facing
2. **Simpler code** - No need for `is_admin()` helper function
3. **Better performance** - Smaller admin table, faster queries
4. **Easier to maintain** - Clear separation of concerns
5. **More scalable** - Admin table stays small as user base grows

**Trade-offs:**
- Slight code changes needed (check admin_users instead of role field)
- Need to migrate existing admins
- One extra table (but it's tiny)

**The migration is straightforward and worth it!**

---

## Quick Implementation

I can create a migration script that:
1. Creates the `admin_users` table
2. Migrates existing admins
3. Updates all RLS policies
4. Updates application code
5. Optionally removes the role field

Would you like me to create this migration?
