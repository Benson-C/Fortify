# RLS Issues: 5 Most Likely Causes & Best Fix

## Error Analysis from Your Logs

**Errors seen:**
- `500` - Internal Server Error (recursion)
- `401` - Unauthorized (RLS blocking)
- `404` - Not Found (RLS blocking access)
- `406` - Not Acceptable (policy conflict)

---

## 5 Most Likely Causes

### 1. ⚠️ **MOST LIKELY: admin_users Table Recursion**

**Problem:**
```sql
create policy "Admins can view admin_users"
  using (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
```

**Why it recurses:**
- Query `admin_users` → RLS checks policy
- Policy queries `admin_users` → RLS checks policy again
- **Infinite loop → 500 error**

**Evidence:** 500 errors when querying users (admin policy triggers)

**Fix:** Use `security definer` function:
```sql
create function public.is_admin_user(uuid) returns boolean
language plpgsql security definer;  -- Bypasses RLS!
```

---

### 2. ⚠️ **VERY LIKELY: users INSERT Policy Queries auth.users**

**Problem:**
```sql
EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = users.id)
```

**Why it fails:**
- RLS policies don't have permission to query `auth` schema
- Returns "permission denied" → 401 error

**Evidence:** 401 errors on INSERT

**Fix:** Use `auth.uid()` directly:
```sql
with check (auth.uid() IS NOT NULL AND id = auth.uid())
```

---

### 3. ⚠️ **LIKELY: users SELECT Blocked by Admin Policy Recursion**

**Problem:**
- Admin policy queries `admin_users` → recursion
- Recursion breaks ALL RLS checks
- Even "Users can view own profile" fails → 404/500

**Evidence:** 404/500 errors on SELECT queries

**Fix:** Fix admin_users recursion first (Fix #1)

---

### 4. ⚠️ **POSSIBLE: Session Timing - auth.uid() Not Available**

**Problem:**
- After `signUp()`, session not fully propagated
- `auth.uid()` returns NULL in RLS context
- Policy check fails → 401

**Evidence:** 401 errors immediately after registration

**Fix:** Refresh session before fallback INSERT (already in your code)

---

### 5. ⚠️ **POSSIBLE: Policy Conflicts**

**Problem:**
- Multiple policies conflict
- RLS can't determine which policy applies
- Returns 406 (Not Acceptable)

**Evidence:** 406 errors

**Fix:** Ensure policies don't conflict, use consistent approach

---

## Most Likely Best Fix

**Run this script:** `supabase/FIX_ALL_RLS_ISSUES.sql`

**What it fixes:**
1. ✅ Creates `is_admin_user()` function (bypasses RLS, no recursion)
2. ✅ Updates all `admin_users` policies to use function
3. ✅ Adds policy for users to check themselves (for `isAdmin()`)
4. ✅ Fixes `users` INSERT policy (uses `auth.uid()` directly)
5. ✅ Ensures `users` SELECT policy exists
6. ✅ Updates all admin policies consistently
7. ✅ Grants execute permissions

**Why this is the best fix:**
- Addresses ALL 5 causes at once
- Uses proven pattern (`security definer` function)
- Consistent approach across all policies
- No recursion anywhere
- No permission issues

---

## Quick Action Plan

1. **Run:** `supabase/FIX_ALL_RLS_ISSUES.sql` in Supabase SQL Editor
2. **Verify:** Check the verification queries at the end
3. **Test:** Try registration again
4. **Monitor:** Check Supabase logs for any remaining errors

---

## Expected Results After Fix

- ✅ No more 500 errors (recursion fixed)
- ✅ No more 401 errors (INSERT policy fixed)
- ✅ No more 404 errors (SELECT policy works)
- ✅ Registration succeeds
- ✅ Profile created automatically or via fallback
