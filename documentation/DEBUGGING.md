# Debugging Registration Failures

This guide will help you debug registration failures in the application.

## Where to Look for Errors

### 1. Browser Console (Primary Source)

**How to Access:**
- Open your browser's Developer Tools (F12 or Cmd+Option+I on Mac)
- Go to the **Console** tab
- Look for messages prefixed with `[REGISTER]`

**What to Look For:**
- `[REGISTER] Starting registration process...` - Process started
- `[REGISTER] ✓` - Success markers
- `[REGISTER] ✗` - Error markers
- Full error objects with `message`, `status`, `details`, `hint`, `code`

**Example Output:**
```
[REGISTER] Starting registration process...
[REGISTER] Form data: { email: "user@example.com", name: "John", ... }
[REGISTER] ✓ Form validation passed
[REGISTER] ✓ Supabase client created
[REGISTER] Attempting to sign up user...
[REGISTER] ✗ Auth error: { message: "...", status: 400, ... }
```

### 2. Browser Network Tab

**How to Access:**
- Developer Tools → **Network** tab
- Filter by "Fetch/XHR" to see API calls
- Look for requests to Supabase

**What to Check:**
- **Request URL**: Should be your Supabase project URL
- **Request Method**: POST for signup
- **Request Payload**: Check if data is being sent correctly
- **Response Status**: 
  - `200` = Success
  - `400` = Bad Request (validation error)
  - `401` = Unauthorized (auth error)
  - `500` = Server Error
- **Response Body**: Contains detailed error messages

**Key Requests to Monitor:**
1. `auth/v1/signup` - User registration
2. `rest/v1/users` - Profile creation/check

### 3. Terminal/Server Logs

**Where:**
- The terminal where you ran `npm run dev`

**What to Look For:**
- Next.js compilation errors
- Server-side errors
- Middleware errors
- Environment variable warnings

### 4. Supabase Dashboard Logs

**How to Access:**
1. Go to your Supabase project dashboard
2. Navigate to **Logs** → **Postgres Logs** or **API Logs**
3. Filter by time range when registration was attempted

**What to Check:**
- Database trigger execution
- SQL errors
- RLS policy violations
- Function execution errors

### 5. Supabase Database

**How to Check:**
1. Go to Supabase Dashboard → **Table Editor**
2. Check `auth.users` table for the new user
3. Check `public.users` table for the profile

**What to Verify:**
- User exists in `auth.users` but not in `public.users` → Trigger failed
- Neither exists → Signup failed
- Both exist → Registration succeeded

## Common Error Scenarios

### Error: "User already registered"
**Location:** Browser console, Network response
**Cause:** Email already exists in Supabase
**Solution:** Use a different email or check if user exists

### Error: "Invalid email address"
**Location:** Browser console (validation error)
**Cause:** Email format doesn't pass Zod validation
**Solution:** Check email format

### Error: "Password must be at least 6 characters"
**Location:** Browser console (validation error)
**Cause:** Password too short
**Solution:** Use a longer password

### Error: "Account created but profile setup failed"
**Location:** Browser console, UI error message
**Cause:** Database trigger failed or RLS policy blocking
**Debug Steps:**
1. Check browser console for detailed error
2. Check Supabase Postgres logs
3. Verify RLS policies are set up correctly
4. Check if `INSERT` policy exists for `users` table

### Error: "Missing Supabase environment variables"
**Location:** Terminal, browser console
**Cause:** `.env.local` not configured or server not restarted
**Solution:**
1. Verify `.env.local` exists with correct values
2. Restart dev server (`Ctrl+C` then `npm run dev`)

### Error: "Network request failed"
**Location:** Browser console, Network tab
**Cause:** Can't reach Supabase API
**Debug Steps:**
1. Check internet connection
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Check if Supabase project is active
4. Check browser Network tab for failed requests

## Step-by-Step Debugging Process

### Step 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Clear console (trash icon)
4. Attempt registration
5. Look for `[REGISTER]` messages
6. Note any errors

### Step 2: Check Network Tab
1. Stay in Developer Tools
2. Go to Network tab
3. Clear network log
4. Attempt registration again
5. Look for:
   - `auth/v1/signup` request
   - Status code
   - Response body

### Step 3: Check Form Data
In browser console, before submitting, check:
```javascript
// In console, you can inspect the form
document.querySelector('form').elements
```

### Step 4: Verify Environment Variables
In terminal, check:
```bash
# Should show your Supabase URL (without exposing the key)
echo $NEXT_PUBLIC_SUPABASE_URL
```

Or check `.env.local` file exists and has:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Check Supabase Dashboard
1. Go to Authentication → Users
2. Check if user was created
3. Go to Table Editor → `public.users`
4. Check if profile exists

### Step 6: Check Database Triggers
1. Go to Supabase Dashboard → Database → Functions
2. Verify `handle_new_user()` function exists
3. Go to Database → Triggers
4. Verify `on_auth_user_created` trigger exists

### Step 7: Test Database Directly
In Supabase SQL Editor, test the trigger:
```sql
-- Check if trigger function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## Adding More Debug Information

The registration code now includes detailed logging. Each step logs:
- ✓ Success markers
- ✗ Error markers
- Full error objects with all properties

To see even more detail, you can add:
```typescript
console.log('[REGISTER] Full response:', JSON.stringify(data, null, 2));
console.log('[REGISTER] Full error:', JSON.stringify(authError, null, 2));
```

## Quick Debug Checklist

- [ ] Browser console shows `[REGISTER]` messages
- [ ] Network tab shows Supabase requests
- [ ] No errors in terminal/server logs
- [ ] Environment variables are set correctly
- [ ] Supabase project is active
- [ ] Database schema is applied (triggers, RLS policies)
- [ ] User appears in `auth.users` table
- [ ] Profile appears in `public.users` table

## Getting Help

When reporting issues, include:
1. **Browser console output** (all `[REGISTER]` messages)
2. **Network tab screenshot** (showing request/response)
3. **Error message** from UI
4. **Steps to reproduce**
5. **Environment** (browser, OS, Supabase project type)
