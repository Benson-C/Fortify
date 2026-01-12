# Supabase Setup Verification

## Current Status

### ✅ Code Configuration
- **Client Setup**: `lib/supabase/client.ts` - ✓ Configured correctly
- **Server Setup**: `lib/supabase/server.ts` - ✓ Configured correctly  
- **Middleware**: `lib/supabase/middleware.ts` - ✓ Configured correctly
- **Schema File**: `supabase/schema.sql` - ✓ Complete with all tables, triggers, and RLS policies

### ⚠️ Environment Variables
- **`.env.local` file**: ✓ Exists
- **`NEXT_PUBLIC_SUPABASE_URL`**: ✗ Missing or not configured
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: ✗ Missing or not configured

## What Needs to Be Checked

### 1. Environment Variables (CRITICAL - Currently Missing)

Your `.env.local` file exists but doesn't contain the required Supabase credentials.

**Required Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to Get These:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Database Schema (Need to Verify in Supabase)

The schema file looks correct, but you need to verify it's applied in Supabase:

**Check in Supabase Dashboard:**
1. Go to **SQL Editor**
2. Run these verification queries:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'events', 'bookings', 'health_metrics');

-- Check if trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if trigger function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

**Expected Results:**
- ✅ 4 tables: `users`, `events`, `bookings`, `health_metrics`
- ✅ Trigger: `on_auth_user_created` (enabled)
- ✅ Function: `handle_new_user`
- ✅ At least 4 policies on `users` table (select, update, insert, admin view)

### 3. RLS Policies (Critical for Security)

Verify these policies exist:

**Users Table Policies:**
- ✅ "Users can view their own profile" (SELECT)
- ✅ "Users can update their own profile" (UPDATE)
- ✅ "Users can insert their own profile" (INSERT) - **Important for registration fallback**
- ✅ "Admins can view all users" (SELECT)

**Events Table Policies:**
- ✅ "Anyone can view events" (SELECT)
- ✅ "Admins can create events" (INSERT)
- ✅ "Admins can update events" (UPDATE)
- ✅ "Admins can delete events" (DELETE)

**Bookings Table Policies:**
- ✅ "Users can view their own bookings" (SELECT)
- ✅ "Users can create their own bookings" (INSERT)
- ✅ "Users can update their own bookings" (UPDATE)
- ✅ "Admins can view all bookings" (SELECT)

**Health Metrics Table Policies:**
- ✅ "Users can view their own health metrics" (SELECT)
- ✅ "Users can insert their own health metrics" (INSERT)
- ✅ "Users can update their own health metrics" (UPDATE)
- ✅ "Admins can view all health metrics" (SELECT)

### 4. Database Trigger (Critical for User Registration)

**Check if trigger is working:**
```sql
-- Test the trigger function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Should return the function definition
```

**If trigger doesn't exist, run:**
```sql
-- From supabase/schema.sql lines 89-109
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'id_number',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Manual Verification Steps

Since there's no Supabase MCP available, here's how to verify manually:

### Step 1: Check Environment Variables
```bash
# In your terminal
cd /Users/brendan/Desktop/projects/bennopi_webapp
cat .env.local

# Should show:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 2: Test Connection
1. Start your dev server: `npm run dev`
2. Open browser console (F12)
3. Try to register a user
4. Check for connection errors

### Step 3: Verify in Supabase Dashboard
1. **Authentication → Users**: Check if test users exist
2. **Table Editor → `public.users`**: Check if profiles were created
3. **Logs → Postgres Logs**: Check for trigger execution errors
4. **Logs → API Logs**: Check for API request errors

### Step 4: Test Database Connection
In Supabase SQL Editor, run:
```sql
-- Should return your tables
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return your custom types
SELECT typname FROM pg_type 
WHERE typname IN ('user_role', 'booking_status', 'event_type');
```

## Common Issues Found

### Issue 1: Missing Environment Variables
**Status**: ⚠️ **CURRENT ISSUE**
- `.env.local` exists but variables are missing
- **Fix**: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Issue 2: Schema Not Applied
**Status**: ⚠️ **NEEDS VERIFICATION**
- Schema file exists but may not be applied to database
- **Fix**: Run `supabase/schema.sql` in Supabase SQL Editor

### Issue 3: Trigger Not Working
**Status**: ⚠️ **NEEDS VERIFICATION**
- Trigger may not exist or may be disabled
- **Fix**: Recreate trigger using SQL from schema.sql

### Issue 4: Missing RLS Policies
**Status**: ⚠️ **NEEDS VERIFICATION**
- RLS policies may not be created
- **Fix**: Run RLS policy creation SQL from schema.sql

## Next Steps

1. **Add environment variables** to `.env.local`
2. **Verify schema is applied** in Supabase Dashboard
3. **Test registration** and check browser console for errors
4. **Check Supabase logs** if registration fails

## Quick Fix Commands

```bash
# 1. Add environment variables (edit .env.local manually)
# Add these lines:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here

# 2. Restart dev server after adding env vars
npm run dev

# 3. Test connection
# Open http://localhost:3000 and try to register
```
