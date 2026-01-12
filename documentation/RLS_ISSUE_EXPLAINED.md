# Understanding the RLS (Row Level Security) Issue

## What is RLS?

**Row Level Security (RLS)** is a PostgreSQL feature that controls who can access which rows in a table. Think of it as a bouncer at a club checking IDs before letting people in.

- **Without RLS**: Anyone with database access can see all rows
- **With RLS**: Each query is checked against policies to see if you're allowed to see/modify specific rows

In your app, RLS ensures:
- Users can only see their own data
- Admins can see everyone's data
- Users can only insert/update their own profile

## The Three RLS Problems

### Problem 1: Infinite Recursion in Admin Policies

**What's Happening:**

When an admin tries to view the users table, this policy runs:

```sql
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users  -- ← PROBLEM: Queries users table!
      where id = auth.uid() and role = 'admin'
    )
  );
```

**The Infinite Loop:**

1. User queries `SELECT * FROM users`
2. RLS checks: "Is this user an admin?"
3. Policy runs: `SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'`
4. **That SELECT triggers RLS again!** (because it's querying the users table)
5. RLS checks: "Is this user an admin?"
6. Policy runs: `SELECT 1 FROM users WHERE...`
7. **Infinite loop!** 🔄

**Why This Happens:**
- RLS policies run for **every** query to that table
- The policy queries the same table it's protecting
- PostgreSQL detects the recursion and throws an error

**The Fix:**
Use a `security definer` function that bypasses RLS:

```sql
-- This function bypasses RLS (runs as superuser)
create function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;  -- ← Bypasses RLS!

-- Policy uses the function (no recursion)
create policy "Admins can view all users"
  using (public.is_admin());  -- ← Function call, not direct query
```

**Why This Works:**
- `security definer` functions run with superuser permissions
- They bypass RLS completely
- The policy calls the function (doesn't query the table)
- No recursion!

---

### Problem 2: INSERT Policy Blocks Fallback Registration

**The Registration Flow:**

When someone registers:

1. ✅ **Supabase Auth** creates user in `auth.users` (works fine)
2. ⚠️ **Database Trigger** should create profile in `public.users`
   - Trigger function: `handle_new_user()`
   - Uses `security definer` (should bypass RLS)
   - **BUT** if trigger fails or doesn't run...
3. ❌ **Fallback Code** tries to INSERT profile manually
   - Your app code: `supabase.from('users').insert(...)`
   - This goes through RLS policies
   - **RLS blocks it!**

**Why the INSERT Policy Blocks It:**

The current policy is:

```sql
create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);
```

**The Problem:**

When the fallback code runs:
1. User was just created in `auth.users`
2. Session might not be fully established yet
3. `auth.uid()` might return `NULL` or not match immediately
4. Policy check fails: `auth.uid() = id` → `false`
5. INSERT is blocked ❌

**Timing Issue:**

```
Time 0ms:  User created in auth.users
Time 50ms: Trigger tries to run (might fail)
Time 100ms: Fallback code tries INSERT
           ↓
           RLS checks: auth.uid() = id?
           ↓
           Session not fully synced yet!
           ↓
           auth.uid() might be NULL or different
           ↓
           Policy check fails
           ↓
           INSERT blocked
```

**The Fix:**

Make the policy more explicit and permissive:

```sql
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    auth.uid() IS NOT NULL      -- ← Explicitly check auth exists
    AND auth.uid() = id          -- ← ID matches
    AND NOT EXISTS (             -- ← Prevent duplicates
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );
```

**Why This Helps:**
- Explicitly checks `auth.uid() IS NOT NULL` first
- Gives the session time to establish
- Prevents duplicate inserts (idempotency)

---

### Problem 3: Trigger Function Might Fail

**What the Trigger Does:**

When a user is created in `auth.users`, this trigger automatically runs:

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**The Trigger Function:**

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, ...)
  values (new.id, new.email, ...);
  return new;
end;
$$ language plpgsql security definer;  -- ← Bypasses RLS
```

**Why It Might Fail:**

1. **Missing data**: If `name` is empty and table requires it
2. **Constraint violation**: Duplicate email (shouldn't happen, but could)
3. **Type mismatch**: Wrong data type in metadata
4. **Database error**: Connection issue, timeout, etc.

**What Happens When Trigger Fails:**

- User exists in `auth.users` ✅
- Profile doesn't exist in `public.users` ❌
- App tries fallback INSERT
- Fallback hits RLS policy
- **If RLS policy is too strict → INSERT fails**

**The Fix:**

1. **Better error handling in trigger:**
   ```sql
   insert into public.users (...)
   on conflict (id) do nothing;  -- ← Prevents duplicate errors
   ```

2. **More permissive INSERT policy** (as shown above)

3. **Fallback code in app** (you already have this)

---

## The Complete Picture

**Normal Flow (Should Work):**
```
Registration Request
    ↓
Create in auth.users ✅
    ↓
Trigger fires automatically
    ↓
handle_new_user() runs (bypasses RLS)
    ↓
Profile created in public.users ✅
    ↓
Registration succeeds!
```

**What Actually Happens (With Issues):**
```
Registration Request
    ↓
Create in auth.users ✅
    ↓
Trigger fires
    ↓
[ISSUE 1] Infinite recursion in admin policies
    → Blocks all RLS checks
    → Trigger might fail
    ↓
[ISSUE 2] Trigger fails or doesn't run
    ↓
Fallback code tries INSERT
    ↓
[ISSUE 3] INSERT policy too strict
    → auth.uid() timing issue
    → Policy check fails
    ↓
INSERT blocked ❌
    ↓
Registration fails with RLS error
```

**After Fixes:**
```
Registration Request
    ↓
Create in auth.users ✅
    ↓
Trigger fires
    ↓
✅ No recursion (is_admin() function bypasses RLS)
    ↓
handle_new_user() runs successfully
    ↓
Profile created ✅
    ↓
OR if trigger fails:
    ↓
Fallback INSERT
    ↓
✅ Permissive policy allows it
    ↓
Profile created ✅
    ↓
Registration succeeds!
```

---

## Key Concepts

### Security Definer Functions

**What it means:**
- Functions normally run with the permissions of the user calling them
- `security definer` functions run with the permissions of the function owner (usually superuser)
- They **bypass RLS completely**

**Why we use it:**
- Allows the trigger to insert without RLS blocking it
- Allows `is_admin()` to check role without recursion
- Essential for system-level operations

**Security note:**
- Still secure because function only does what it's designed to do
- Can't be exploited to access unauthorized data
- Only checks the current user's own role

### RLS Policy Evaluation

**How RLS works:**
1. User makes a query: `SELECT * FROM users`
2. PostgreSQL intercepts the query
3. Checks all RLS policies for that table
4. If ANY policy allows access → query proceeds
5. If NO policies allow access → query is blocked

**Policy types:**
- `USING` clause: Controls SELECT, UPDATE, DELETE (can you see/modify this row?)
- `WITH CHECK` clause: Controls INSERT, UPDATE (can you insert/update with these values?)

**For your INSERT policy:**
```sql
with check (
  auth.uid() IS NOT NULL AND auth.uid() = id
)
```
This means: "You can only insert a row if the ID matches your authenticated user ID"

---

## Why This Is Complex

**Multiple Systems Interacting:**
1. **Supabase Auth** - Creates user account
2. **PostgreSQL Trigger** - Auto-creates profile
3. **RLS Policies** - Control access
4. **Your App Code** - Fallback if trigger fails

**Timing Dependencies:**
- Auth creates user → Session needs time to establish
- Trigger runs → Might fail silently
- Fallback runs → Needs session to be ready
- RLS checks → Needs auth context

**Cascading Failures:**
- Infinite recursion → Blocks all RLS checks
- Trigger failure → Falls back to manual INSERT
- Strict INSERT policy → Blocks fallback
- Result: Registration fails

---

## Summary

**The Root Causes:**

1. **Infinite Recursion**: Admin policies query the users table, triggering RLS again
2. **Strict INSERT Policy**: Doesn't account for timing issues after registration
3. **Trigger Failures**: If trigger fails, fallback hits RLS which blocks it

**The Solutions:**

1. **Helper Function**: `is_admin()` bypasses RLS, prevents recursion
2. **Permissive Policy**: Explicit checks + duplicate prevention
3. **Better Trigger**: Error handling + conflict resolution

**The Fix:**
Run `supabase/COMPLETE_FIX.sql` to apply all fixes at once!
