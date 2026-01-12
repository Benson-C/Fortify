# RLS Error Codes Explained

## Error Analysis from Your Logs

### 500 Error (Internal Server Error)
**What it means:** Server-side error, likely infinite recursion in RLS policies

**When it happens:**
- Querying `users` table triggers admin policy
- Admin policy queries `admin_users` table
- `admin_users` policy queries `admin_users` again → recursion → 500

**Fix:** Use `security definer` function to bypass RLS

---

### 401 Error (Unauthorized)
**What it means:** RLS policy is blocking the operation

**When it happens:**
- INSERT into `users` table
- Policy check fails: `auth.uid() = id` returns false
- OR policy queries `auth.users` → permission denied

**Fix:** Use `auth.uid()` directly, don't query `auth.users`

---

### 404 Error (Not Found)
**What it means:** Resource not found OR RLS is blocking access completely

**When it happens:**
- SELECT query returns no rows
- OR RLS policy blocks access so Supabase returns 404 instead of 401

**Fix:** Ensure SELECT policies allow users to view their own data

---

### 406 Error (Not Acceptable)
**What it means:** Content negotiation failed OR RLS policy issue

**When it happens:**
- Less common, but can occur with RLS policy conflicts
- Usually indicates a policy is malformed or conflicting

**Fix:** Ensure policies are properly structured

---

## Root Causes Summary

1. **admin_users recursion** → 500 errors
2. **users INSERT policy** → 401 errors  
3. **users SELECT policy** → 404/500 errors
4. **Session timing** → 401 errors (auth.uid() not available)
5. **Policy conflicts** → 406 errors

## The Fix

Run `supabase/FIX_ALL_RLS_ISSUES.sql` to fix everything at once!
