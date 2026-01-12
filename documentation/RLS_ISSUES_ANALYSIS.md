# RLS Issues Analysis: 5 Most Likely Causes

## Issue 1: Infinite Recursion in admin_users Table Policies ⚠️ **MOST LIKELY**

**Problem:**
The `admin_users` table policies query `admin_users` itself, causing recursion:

```sql
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
```

**Why it recurses:**
1. Query `admin_users` table
2. RLS checks policy
3. Policy queries `admin_users` table
4. RLS checks policy again
5. **Infinite loop!**

**Fix:** Use a `security definer` function OR allow users to check their own admin status directly.

---

## Issue 2: INSERT Policy Checks auth.users (Permission Denied) ⚠️ **VERY LIKELY**

**Problem:**
The INSERT policy for `users` table checks `auth.users`:

```sql
create policy "Users can insert their own profile"
  with check (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = users.id)
  );
```

**Why it fails:**
- RLS policies may not have permission to query `auth.users` schema
- `auth.users` is in a different schema and may be restricted
- Returns "permission denied"

**Fix:** Use `auth.uid()` directly instead of querying `auth.users`.

---

## Issue 3: NOT EXISTS Check Queries users Table (Recursion Risk) ⚠️ **LIKELY**

**Problem:**
The INSERT policy has:

```sql
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = users.id
)
```

**Why it might fail:**
- Queries `users` table during INSERT check
- Could trigger RLS policies
- Might cause timing/permission issues

**Fix:** Remove the NOT EXISTS check (duplicate prevention handled by unique constraint).

---

## Issue 4: Session Timing - auth.uid() Not Available ⚠️ **POSSIBLE**

**Problem:**
After `signUp()`, `auth.uid()` might not be immediately available in RLS context.

**Why it happens:**
- Session propagation delay
- Database context not synced with auth context
- `auth.uid()` returns NULL

**Fix:** Use a more permissive policy that doesn't rely on `auth.uid()` timing.

---

## Issue 5: admin_users Policies Block Initial Admin Creation ⚠️ **POSSIBLE**

**Problem:**
The first admin can't be created because:
- Policy requires existing admin to insert
- But no admins exist yet!
- Chicken-and-egg problem

**Fix:** Allow service role or use a different mechanism for initial admin creation.

---

## Most Likely Best Fix

### Fix 1: admin_users Recursion (CRITICAL)

**Solution:** Use a `security definer` function OR allow users to check themselves:

```sql
-- Option A: Security definer function (bypasses RLS)
create or replace function public.is_admin_user(user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = user_uuid
  );
end;
$$ language plpgsql security definer stable;

-- Update policies to use function
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (public.is_admin_user(auth.uid()));

-- Option B: Allow users to check themselves (simpler)
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Users can check own admin status"
  on public.admin_users for select
  using (user_id = auth.uid());
  
create policy "Admins can view all admin_users"
  on public.admin_users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
```

**Best Choice:** Option B - Allow users to check themselves, admins to see all.

### Fix 2: users INSERT Policy (CRITICAL)

**Solution:** Use `auth.uid()` directly, remove `auth.users` query:

```sql
drop policy if exists "Users can insert their own profile" on public.users;

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );
```

**Why this works:**
- `auth.uid()` is a built-in function (no table query needed)
- No permission issues
- More reliable after signUp()

---

## Complete Fix Script

See: `supabase/FIX_RLS_RECURSION_FINAL.sql`
