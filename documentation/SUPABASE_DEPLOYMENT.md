# Supabase Deployment Guide

Complete guide for deploying and configuring the Supabase database for the Health & Fitness Research Study Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Deploy Database Schema](#step-2-deploy-database-schema)
4. [Step 3: Configure Row-Level Security](#step-3-configure-row-level-security)
5. [Step 4: Create Initial Admin User](#step-4-create-initial-admin-user)
6. [Step 5: Configure Authentication](#step-5-configure-authentication)
7. [Step 6: Verify Deployment](#step-6-verify-deployment)
8. [Step 7: Get API Credentials](#step-7-get-api-credentials)
9. [Troubleshooting](#troubleshooting)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Supabase account** ([Sign up](https://supabase.com) - free tier available)
- ✅ **Access to Supabase Dashboard** (web interface)
- ✅ **Basic understanding of SQL** (helpful but not required - we provide all scripts)
- ✅ **Project code** downloaded/cloned locally

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Sign in with GitHub, Google, or email

### 1.2 Create New Project

1. Click **"New Project"** (or **"New"** → **"Project"**)
2. Fill in project details:
   - **Name**: `fit-check` (or your preferred name)
   - **Database Password**: 
     - ⚠️ **IMPORTANT**: Save this password securely! You'll need it later.
     - Use a strong password (at least 12 characters, mix of letters, numbers, symbols)
     - Store it in a password manager
   - **Region**: Choose closest to your users (e.g., `US East`, `EU West`)
   - **Pricing Plan**: Select **Free** (or paid if you need more resources)
3. Click **"Create new project"**

### 1.3 Wait for Project Setup

- ⏱️ **This takes 1-2 minutes**
- You'll see "Setting up your project..." message
- Wait until you see "Project is ready" or the dashboard loads

### 1.4 Verify Project is Active

- Check project status shows **"Active"** (green indicator)
- If it shows "Paused", click **"Resume"** to activate it

---

## Step 2: Deploy Database Schema

### 2.1 Open SQL Editor

1. In Supabase Dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** (top right)

### 2.2 Copy Schema File

1. Open `supabase/schema.sql` from your project
2. **Copy the entire file** (Cmd+A / Ctrl+A, then Cmd+C / Ctrl+C)
3. The file should be ~491 lines

### 2.3 Paste and Run Schema

1. In Supabase SQL Editor, **paste** the schema (Cmd+V / Ctrl+V)
2. Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)
3. Wait for execution to complete (usually 5-10 seconds)

### 2.4 Verify Schema Deployment

You should see:
- ✅ **Success message**: "Success. No rows returned"
- ✅ **No errors** in the output

**If you see errors:**
- Check the error message
- Common issues:
  - **"relation already exists"**: Schema was already run (this is OK - it's idempotent)
  - **"permission denied"**: You may need to run as service role (rare)
  - **"syntax error"**: Check you copied the entire file correctly

### 2.5 Verify Tables Were Created

1. In Supabase Dashboard, click **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ `users`
   - ✅ `admin_users`
   - ✅ `events`
   - ✅ `bookings`
   - ✅ `health_metrics`

**If tables are missing:**
- Re-run `schema.sql` (it's safe to run multiple times - uses `if not exists`)
- Check SQL Editor for error messages

---

## Step 3: Configure Row-Level Security

### 3.1 Why This Step is Critical

**Row-Level Security (RLS)** prevents users from accessing data they shouldn't see. Without proper RLS:
- ❌ Users could see other users' data
- ❌ Users could modify admin settings
- ❌ Security vulnerabilities

**This step fixes common RLS issues:**
- Infinite recursion errors
- Permission denied errors
- Registration failures

### 3.2 Run RLS Fix Script

1. In Supabase SQL Editor, click **"New query"**
2. Open `supabase/FIX_ALL_RLS_ISSUES.sql` from your project
3. **Copy the entire file**
4. **Paste** into SQL Editor
5. Click **"Run"**

### 3.3 Verify RLS Fixes

You should see a verification table with these results:

| check_type | name | status |
|------------|------|--------|
| ✓ Helper Function | is_admin_user | security definer ✓ |
| ✓ admin_users Policies | 4 policies | All policies created ✓ |
| ✓ users INSERT Policy | Users can insert their own profile | Uses auth.uid() ✓ |
| ✓ users SELECT Policies | 2 policies | User + Admin policies exist ✓ |
| ✓ Admin Policies Updated | 7+ policies use is_admin_user() | No recursion ✓ |

**If any show ✗:**
- Check the error messages in SQL Editor
- Re-run the script (it's safe to run multiple times)
- See [Troubleshooting](#troubleshooting) section

### 3.4 Verify RLS is Enabled

1. In Supabase Dashboard, go to **"Table Editor"**
2. Click on any table (e.g., `users`)
3. Check the **"RLS"** column header - it should show a lock icon 🔒
4. All tables should have RLS enabled

---

## Step 4: Create Initial Admin User

### 4.1 Why You Need an Admin

- Admins can create/edit events
- Admins can view all users and bookings
- Admins can manage other admins

**Without an admin user:**
- ❌ You can't create events
- ❌ You can't access admin dashboard
- ❌ You can't manage the platform

### 4.2 Method 1: Create Admin After Registration (Recommended)

**This is the easiest method:**

1. **Register a regular user** through your app:
   - Go to your app's registration page
   - Create an account with your email
   - Complete registration

2. **Get your user ID**:
   - In Supabase Dashboard → **"Table Editor"** → `users` table
   - Find your email in the `users` table
   - Copy the `id` (UUID) - it looks like `59389d6e-01bb-4bdf-9bfb-83580dc30d44`

3. **Add yourself as admin**:
   - In Supabase SQL Editor, run:
   ```sql
   INSERT INTO public.admin_users (user_id, created_by, notes)
   VALUES ('YOUR_USER_ID_HERE', 'YOUR_USER_ID_HERE', 'Initial admin user');
   ```
   - Replace `YOUR_USER_ID_HERE` with your actual user ID (twice)
   - Click **"Run"**

4. **Verify admin status**:
   - Refresh your app
   - Log in
   - You should be redirected to `/admin` dashboard
   - If not, check the user ID was correct

### 4.3 Method 2: Create Admin via SQL (Advanced)

If you want to create an admin user directly via SQL:

1. **Create auth user first** (if not already created):
   ```sql
   -- This requires service role key - use Supabase Dashboard → Authentication → Users → Add User
   -- Or use the Supabase Management API
   ```

2. **Then add to admin_users**:
   ```sql
   INSERT INTO public.admin_users (user_id, created_by, notes)
   VALUES ('USER_ID_FROM_AUTH_USERS', 'USER_ID_FROM_AUTH_USERS', 'Initial admin');
   ```

**Note:** Method 1 is easier and recommended for most users.

### 4.4 Verify Admin User

1. In Supabase Dashboard → **"Table Editor"** → `admin_users` table
2. You should see your user ID listed
3. In your app, log in and verify you're redirected to `/admin`

---

## Step 5: Configure Authentication

### 5.1 Enable Email Authentication

1. In Supabase Dashboard, go to **"Authentication"** → **"Providers"**
2. Find **"Email"** provider
3. Ensure it's **enabled** (toggle should be ON)
4. **Email confirmation** settings:
   - **For development**: Disable "Confirm email" (easier testing)
   - **For production**: Enable "Confirm email" (more secure)

### 5.2 Configure Email Templates (Optional)

1. Go to **"Authentication"** → **"Email Templates"**
2. Customize templates if desired:
   - **Confirm signup**
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

### 5.3 Configure Redirect URLs

1. Go to **"Authentication"** → **"URL Configuration"**
2. Add your app URLs to **"Redirect URLs"**:
   - **Development**: `http://localhost:3000/**`
   - **Production**: `https://your-app.vercel.app/**`
   - **Auth callback**: `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`

3. Add to **"Site URL"**:
   - **Development**: `http://localhost:3000`
   - **Production**: `https://your-app.vercel.app`

### 5.4 Configure Password Requirements (Optional)

1. Go to **"Authentication"** → **"Policies"**
2. Set password requirements:
   - **Minimum length**: 8 characters (recommended)
   - **Require uppercase**: Optional
   - **Require lowercase**: Optional
   - **Require numbers**: Optional
   - **Require special characters**: Optional

---

## Step 6: Verify Deployment

### 6.1 Test Database Connection

1. In Supabase Dashboard → **"SQL Editor"**
2. Run a test query:
   ```sql
   SELECT COUNT(*) as user_count FROM public.users;
   SELECT COUNT(*) as admin_count FROM public.admin_users;
   SELECT COUNT(*) as event_count FROM public.events;
   ```
3. All should return `0` (no errors = tables exist and are accessible)

### 6.2 Test RLS Policies

1. **Test user can insert own profile**:
   ```sql
   -- This will be tested when you register a user through the app
   -- If registration works, RLS INSERT policy is working
   ```

2. **Test admin policies**:
   - Log in as admin user
   - Access `/admin` dashboard
   - If you can see all users/events, admin policies work

### 6.3 Test Functions

1. In SQL Editor, test `is_admin_user` function:
   ```sql
   SELECT public.is_admin_user('YOUR_USER_ID');
   ```
   - Should return `true` if user is admin, `false` otherwise

2. Test `create_booking_safe` function (after creating an event):
   ```sql
   SELECT public.create_booking_safe('USER_ID', 'EVENT_ID');
   ```
   - Should return JSON with `success: true` or error message

### 6.4 Test Registration Flow

1. **Start your local app**: `npm run dev`
2. **Go to registration page**: `http://localhost:3000/register`
3. **Register a test user**:
   - Fill in all fields
   - Submit form
   - Should redirect to `/dashboard` (not `/admin` unless you're admin)
4. **Check Supabase**:
   - Go to **"Table Editor"** → `users` table
   - Your new user should appear
   - Check `admin_users` table - should NOT have this user (unless you added them)

### 6.5 Test Login Flow

1. **Log out** (if logged in)
2. **Go to login page**: `http://localhost:3000/login`
3. **Log in** with test user credentials
4. **Should redirect** to `/dashboard`
5. **Check browser console** (F12) - no errors

---

## Step 7: Get API Credentials

### 7.1 Get Project URL and Keys

1. In Supabase Dashboard, go to **"Settings"** → **"API"**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Keep secret!)

### 7.2 Copy Credentials

**For your `.env.local` file:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Important:**
- ✅ Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key) - safe for client-side
- ❌ **NEVER** use `service_role` key in client-side code
- ❌ **NEVER** commit `.env.local` to git (already in `.gitignore`)

### 7.3 Add to Environment Variables

1. **For local development**: Add to `.env.local` in project root:
   ```bash
   # Create file if it doesn't exist
   touch .env.local
   
   # Add these lines:
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **For production** (Vercel):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add both variables
   - See [DEPLOYMENT.md](../DEPLOYMENT.md) for details

### 7.4 Restart Development Server

After adding environment variables:
```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Troubleshooting

### Schema Deployment Issues

**Error: "relation already exists"**
- ✅ **This is OK!** The schema uses `if not exists` - it's safe to run multiple times
- The error means tables already exist, which is fine

**Error: "permission denied"**
- Check you're running queries in SQL Editor (not via API)
- SQL Editor runs with elevated permissions
- If still failing, check you're the project owner

**Error: "syntax error"**
- Verify you copied the entire `schema.sql` file
- Check for any copy/paste issues
- Try copying in smaller chunks if file is very large

### RLS Policy Issues

**Error: "infinite recursion detected"**
- ✅ **Fixed by** `FIX_ALL_RLS_ISSUES.sql` script
- If still happening, re-run the fix script
- Check that `is_admin_user()` function exists and is `security definer`

**Error: "new row violates row-level security policy"**
- ✅ **Fixed by** `FIX_ALL_RLS_ISSUES.sql` script
- Verify `users` INSERT policy uses `auth.uid()` (not `auth.users` query)
- Check user is authenticated before inserting

**Error: "permission denied for table users"**
- ✅ **Fixed by** `FIX_ALL_RLS_ISSUES.sql` script
- Verify INSERT policy doesn't query `auth.users` directly
- Use `auth.uid()` function instead

### Registration Issues

**Registration fails with 500 error**
- Check Supabase Postgres Logs (Dashboard → Logs → Postgres Logs)
- Verify RLS policies are correct (run `FIX_ALL_RLS_ISSUES.sql`)
- Check trigger function `handle_new_user()` exists and works

**Profile not created after registration**
- Check trigger `on_auth_user_created` exists on `auth.users`
- Check trigger function `handle_new_user()` has no errors
- Fallback code in app should create profile if trigger fails

**User can't log in after registration**
- Check email confirmation is disabled (for development)
- Or check email and click confirmation link
- Verify user exists in `auth.users` table

### Admin Access Issues

**Can't access `/admin` dashboard**
- Verify user exists in `admin_users` table
- Check `isAdmin()` function in app queries `admin_users` correctly
- Verify RLS policy "Users can check own admin status" exists

**Admin policies not working**
- Verify `is_admin_user()` function exists and is `security definer`
- Check all admin policies use `public.is_admin_user(auth.uid())`
- Re-run `FIX_ALL_RLS_ISSUES.sql` if needed

### Function Issues

**Error: "function does not exist"**
- Verify `schema.sql` was run completely
- Check functions exist: `is_admin_user`, `create_booking_safe`, `get_event_bookings_count`
- Re-run `schema.sql` if functions are missing

**Error: "permission denied for function"**
- Verify `grant execute` statements were run
- Check `FIX_ALL_RLS_ISSUES.sql` grants permissions
- Functions should be granted to `authenticated` role

### Connection Issues

**Error: "Failed to fetch"**
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify project is active (not paused)
- Check network connectivity
- Verify CORS settings (should allow your domain)

**Error: "Invalid API key"**
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check you're using "anon public" key (not service_role)
- Verify key hasn't been rotated in Supabase

---

## Production Checklist

Before going to production, verify:

### Database Setup
- [ ] Schema deployed successfully
- [ ] All tables created (`users`, `admin_users`, `events`, `bookings`, `health_metrics`)
- [ ] All indexes created
- [ ] All functions created (`is_admin_user`, `create_booking_safe`, `get_event_bookings_count`)
- [ ] All triggers created (`on_auth_user_created`, `set_updated_at_*`)

### Security
- [ ] RLS enabled on all tables
- [ ] RLS policies created and tested
- [ ] `FIX_ALL_RLS_ISSUES.sql` run successfully
- [ ] No infinite recursion errors
- [ ] Admin policies working correctly
- [ ] User policies working correctly

### Authentication
- [ ] Email authentication enabled
- [ ] Email confirmation configured (enable for production)
- [ ] Redirect URLs configured
- [ ] Password requirements set
- [ ] Email templates customized (optional)

### Admin Setup
- [ ] At least one admin user created
- [ ] Admin can access `/admin` dashboard
- [ ] Admin can create/edit events
- [ ] Admin can view all users/bookings

### Testing
- [ ] Registration works
- [ ] Login works
- [ ] Profile creation works (trigger or fallback)
- [ ] User can view own data
- [ ] User cannot view other users' data
- [ ] Admin can view all data
- [ ] Booking creation works
- [ ] Health metrics creation works

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] Variables added to Vercel (for production)
- [ ] Variables NOT committed to git

### Monitoring
- [ ] Supabase project is active (not paused)
- [ ] Database usage within limits (free tier: 500MB)
- [ ] API usage within limits (free tier: 50K requests/month)
- [ ] Logs monitored for errors

---

## Quick Reference

### Essential SQL Scripts

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `schema.sql` | Creates all tables, functions, triggers | Once (initial setup) |
| `FIX_ALL_RLS_ISSUES.sql` | Fixes RLS recursion and permission issues | After schema, or if RLS errors occur |

### Common SQL Queries

**Check if user is admin:**
```sql
SELECT public.is_admin_user('USER_ID');
```

**List all admins:**
```sql
SELECT u.email, u.name, au.created_at
FROM public.admin_users au
JOIN public.users u ON u.id = au.user_id;
```

**Create admin user:**
```sql
INSERT INTO public.admin_users (user_id, created_by, notes)
VALUES ('USER_ID', 'USER_ID', 'Admin description');
```

**Remove admin user:**
```sql
DELETE FROM public.admin_users WHERE user_id = 'USER_ID';
```

**Check RLS policies:**
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Supabase Dashboard Locations

- **SQL Editor**: Left sidebar → "SQL Editor"
- **Table Editor**: Left sidebar → "Table Editor"
- **Authentication**: Left sidebar → "Authentication"
- **API Settings**: Left sidebar → "Settings" → "API"
- **Logs**: Left sidebar → "Logs"

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Functions](https://supabase.com/docs/guides/database/functions)
- [Authentication Setup](https://supabase.com/docs/guides/auth)
- [Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

## Need Help?

If you encounter issues not covered here:

1. **Check Supabase Logs**: Dashboard → Logs → Postgres Logs / API Logs
2. **Check Application Logs**: Browser console (F12) or server logs
3. **Review Error Messages**: Copy exact error message and search Supabase docs
4. **Verify Setup Steps**: Go through this guide again step-by-step

---

**Last Updated**: Based on schema.sql version with admin_users architecture
