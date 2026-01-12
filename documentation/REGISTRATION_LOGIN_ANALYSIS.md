# Supabase Registration & Login Flow Analysis

## Overview

This document analyzes the registration and login flows for potential issues, security vulnerabilities, and improvements.

---

## 🔴 Critical Issues

### 1. No Email Verification Handling
**Severity:** Critical  
**Location:** `app/register/page.tsx`, `app/login/page.tsx`

**Problem:**
- Registration doesn't check if email verification is required
- Login doesn't handle unverified users
- Users can register and immediately access the app without verifying email
- No redirect to verification page or message

**Current Code:**
```typescript
// register/page.tsx - No check for email confirmation
const { data, error: authError } = await supabase.auth.signUp({...});
if (data.user) {
  router.push('/dashboard'); // Immediately redirects, no verification check
}
```

**Issues:**
1. Supabase may require email verification by default
2. `data.user` might be null if email confirmation is required
3. `data.session` will be null if email confirmation is required
4. User can't access app until they verify, but gets no guidance

**Fix Required:**
```typescript
const { data, error: authError } = await supabase.auth.signUp({
  email: validated.email,
  password: validated.password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      name: validated.name,
      phone_number: validated.phone_number || null,
      id_number: validated.id_number || null,
    },
  },
});

if (authError) {
  // Handle error
}

// Check if email confirmation is required
if (data.user && !data.session) {
  // Email confirmation required
  router.push('/register/verify-email?email=' + encodeURIComponent(validated.email));
  return;
}

if (data.user && data.session) {
  // User is immediately logged in (email confirmation disabled)
  // Continue with profile creation...
}
```

**Impact:** Users may be unable to log in after registration if email verification is enabled.

---

### 2. Race Condition with Arbitrary Delays
**Severity:** Critical  
**Location:** `app/register/page.tsx:90, 119`

**Problem:**
- Uses `setTimeout` with arbitrary delays (500ms) to wait for trigger
- This is unreliable and can fail under load or slow networks
- No retry mechanism or proper polling

**Current Code:**
```typescript
// Step 4: Wait for database trigger to create profile
await new Promise(resolve => setTimeout(resolve, 500));

// Step 5: Check if profile exists
const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('id')
  .eq('id', data.user.id)
  .single();

if (profileError || !profile) {
  // Wait more...
  await new Promise(resolve => setTimeout(resolve, 500));
  // Fallback insert...
}
```

**Issues:**
1. 500ms may not be enough on slow networks
2. 500ms may be too long on fast networks (poor UX)
3. No guarantee trigger has completed
4. Race condition: trigger might still be running when fallback executes

**Fix Required:**
```typescript
// Poll with exponential backoff instead of fixed delay
async function waitForProfile(userId: string, maxAttempts = 5): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (profile) {
      return true;
    }
    
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
  }
  return false;
}

// Usage:
const profileExists = await waitForProfile(data.user.id);
if (!profileExists) {
  // Fallback insert...
}
```

**Impact:** Registration can fail intermittently, especially under load.

---

### 3. Console.log Statements in Production Code
**Severity:** Critical (Violates User Rule)  
**Location:** `app/register/page.tsx` (multiple locations)

**Problem:**
- User rule states: "funnel logs through debug; remove console.log in prod via build step"
- Multiple `console.warn` and `console.error` statements throughout registration flow
- No debug package usage
- Logs will appear in production browser console

**Current Code:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn('[REGISTER] Starting registration process...');
}
console.error('[REGISTER] ✗ Auth error:', {...});
```

**Fix Required:**
```typescript
import debug from 'debug';
const log = debug('app:register');

// Replace all console.warn/error with:
log('Starting registration process...');
log('Auth error: %O', authError);
```

**Impact:** Violates coding standards, exposes internal details in production.

---

### 4. Missing Profile Check After Login
**Severity:** High  
**Location:** `app/login/page.tsx`, `lib/auth.ts`

**Problem:**
- Login doesn't verify profile exists in `public.users` table
- If trigger failed during registration, user can log in but can't access app
- `getUserProfile()` will fail, but error handling is poor

**Current Code:**
```typescript
// login/page.tsx - No profile check
if (data.user) {
  router.push('/dashboard'); // Assumes profile exists
}

// lib/auth.ts - Fails silently if profile missing
const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('id, email, name, phone_number, id_number')
  .eq('id', authUser.id)
  .single();

if (profileError || !profile) {
  return { user: null, error: ... }; // Just returns error, no recovery
}
```

**Fix Required:**
```typescript
// login/page.tsx - Check profile after login
if (data.user) {
  // Verify profile exists
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', data.user.id)
    .single();
  
  if (!profile) {
    // Profile missing - create it now
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || 'User',
        phone_number: data.user.user_metadata?.phone_number || null,
        id_number: data.user.user_metadata?.id_number || null,
      });
    
    if (insertError) {
      setError('Profile setup failed. Please contact support.');
      return;
    }
  }
  
  router.push('/dashboard');
}
```

**Impact:** Users may be unable to access app after login if profile creation failed.

---

## 🟠 High-Priority Issues

### 5. Inefficient Admin Check in Middleware
**Severity:** High  
**Location:** `lib/supabase/middleware.ts:71-75`

**Problem:**
- Admin check happens on EVERY request
- Database query on every page load
- No caching mechanism
- Can cause performance issues

**Current Code:**
```typescript
// Runs on every request
const { data: adminCheck, error: adminError } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();
```

**Fix Required:**
```typescript
// Option 1: Cache in session/JWT claims
// Option 2: Cache in memory with TTL
// Option 3: Store in user metadata

// Best: Use Supabase JWT claims
// Add admin status to JWT via database function
// Then check from token instead of querying DB
```

**Impact:** Unnecessary database load, slower page loads.

---

### 6. Weak Password Requirements
**Severity:** High  
**Location:** `lib/validations.ts:5`

**Problem:**
- Only requires 6 characters minimum
- No complexity requirements
- No common password checks
- Vulnerable to brute force

**Current Code:**
```typescript
password: z.string().min(6, 'Password must be at least 6 characters'),
```

**Fix Required:**
```typescript
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
```

**Impact:** Weak passwords vulnerable to brute force attacks.

---

### 7. No Rate Limiting
**Severity:** High  
**Location:** Missing

**Problem:**
- No rate limiting on registration endpoint
- No rate limiting on login endpoint
- Vulnerable to brute force and spam registrations

**Fix Required:**
- Implement rate limiting middleware
- Use Supabase rate limiting features
- Add CAPTCHA for registration after N attempts

**Impact:** Vulnerable to brute force attacks and spam.

---

### 8. Missing Session Refresh After Registration
**Severity:** Medium  
**Location:** `app/register/page.tsx:159`

**Problem:**
- Uses `router.refresh()` but doesn't explicitly refresh Supabase session
- Session might not be fully propagated
- Could cause issues with middleware

**Current Code:**
```typescript
router.push('/dashboard');
router.refresh(); // May not refresh Supabase session
```

**Fix Required:**
```typescript
// Explicitly refresh session
await supabase.auth.refreshSession();
router.push('/dashboard');
router.refresh();
```

**Impact:** Users might see auth errors immediately after registration.

---

## 🟡 Medium-Priority Issues

### 9. No CSRF Protection
**Severity:** Medium  
**Location:** Missing

**Problem:**
- No CSRF tokens on forms
- Relies on SameSite cookies only
- Could be vulnerable to CSRF attacks

**Fix Required:**
- Add CSRF tokens to forms
- Verify tokens on server-side
- Use Supabase's built-in CSRF protection

**Impact:** Potential CSRF vulnerabilities.

---

### 10. Error Messages Too Verbose
**Severity:** Low-Medium  
**Location:** `app/register/page.tsx`, `app/login/page.tsx`

**Problem:**
- Error messages expose internal details
- Database error codes shown to users
- Could aid attackers

**Current Code:**
```typescript
setError(`Account created but profile setup failed: ${insertError.message}`);
```

**Fix Required:**
```typescript
// Generic error messages for users
// Log detailed errors server-side only
setError('Registration failed. Please try again or contact support.');
logger.error('Registration failed', { error: insertError, userId: data.user.id });
```

**Impact:** Information disclosure, potential security risk.

---

### 11. No Input Sanitization
**Severity:** Medium  
**Location:** `app/register/page.tsx`

**Problem:**
- User input passed directly to database
- No sanitization of name, phone_number, id_number
- Could allow XSS or injection (though Supabase handles SQL injection)

**Fix Required:**
```typescript
// Sanitize inputs
import DOMPurify from 'isomorphic-dompurify';

const sanitizedName = DOMPurify.sanitize(validated.name);
const sanitizedPhone = validated.phone_number ? DOMPurify.sanitize(validated.phone_number) : null;
```

**Impact:** Potential XSS vulnerabilities in stored data.

---

### 12. Fallback Insert Doesn't Use Same Data Source
**Severity:** Medium  
**Location:** `app/register/page.tsx:125-134`

**Problem:**
- Fallback insert uses form data instead of `raw_user_meta_data`
- Could have inconsistencies if trigger partially succeeded
- Doesn't check if profile was created between checks

**Current Code:**
```typescript
const { error: insertError } = await supabase
  .from('users')
  .insert({
    id: data.user.id,
    email: validated.email, // Uses form data, not metadata
    name: validated.name,
    // ...
  });
```

**Fix Required:**
```typescript
// Use same data source as trigger
// Check one more time before inserting
const { data: finalCheck } = await supabase
  .from('users')
  .select('id')
  .eq('id', data.user.id)
  .single();

if (!finalCheck) {
  // Get metadata from auth user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: data.user.id,
      email: data.user.email,
      name: authUser?.user_metadata?.name || validated.name,
      phone_number: authUser?.user_metadata?.phone_number || validated.phone_number || null,
      id_number: authUser?.user_metadata?.id_number || validated.id_number || null,
    });
}
```

**Impact:** Data inconsistencies, potential duplicate key errors.

---

### 13. No Loading State Management for Profile Check
**Severity:** Low  
**Location:** `app/register/page.tsx`

**Problem:**
- User sees "Creating account..." but doesn't know about profile check delay
- No progress indication during waits
- Poor UX

**Fix Required:**
```typescript
const [status, setStatus] = useState<string>('');

// During registration:
setStatus('Creating account...');
// After signUp:
setStatus('Setting up your profile...');
// During profile check:
setStatus('Verifying profile...');
```

**Impact:** Poor user experience, users might think app is frozen.

---

## ✅ Good Practices Found

1. ✅ Uses Zod for validation
2. ✅ Proper error handling structure
3. ✅ Loading states during async operations
4. ✅ Form validation before submission
5. ✅ Password confirmation check
6. ✅ Security definer trigger function
7. ✅ Fallback mechanism for profile creation

---

## 📋 Summary of Required Fixes

### Immediate Actions (Critical)
1. ✅ Add email verification handling
2. ✅ Replace arbitrary delays with proper polling/retry
3. ✅ Replace console.log with debug package
4. ✅ Add profile check after login

### High Priority
5. ✅ Optimize admin check in middleware (add caching)
6. ✅ Strengthen password requirements
7. ✅ Add rate limiting
8. ✅ Add explicit session refresh

### Medium Priority
9. ✅ Add CSRF protection
10. ✅ Sanitize user inputs
11. ✅ Improve error messages (less verbose)
12. ✅ Fix fallback insert to use same data source
13. ✅ Improve loading state UX

---

## Testing Recommendations

### Registration Testing
- [ ] Test with email verification enabled
- [ ] Test with email verification disabled
- [ ] Test slow network (trigger delay)
- [ ] Test rapid registration attempts (rate limiting)
- [ ] Test with invalid inputs
- [ ] Test profile creation failure scenarios

### Login Testing
- [ ] Test login with missing profile
- [ ] Test login with unverified email
- [ ] Test login with invalid credentials
- [ ] Test rapid login attempts (rate limiting)
- [ ] Test session persistence

### Security Testing
- [ ] Test brute force protection
- [ ] Test CSRF protection
- [ ] Test XSS in user inputs
- [ ] Test SQL injection (should be handled by Supabase)
- [ ] Test session hijacking protection

---

## Related Files

- `app/register/page.tsx` - Registration flow
- `app/login/page.tsx` - Login flow
- `lib/auth.ts` - Auth utilities
- `lib/supabase/middleware.ts` - Middleware with admin check
- `lib/validations.ts` - Input validation schemas
- `supabase/schema.sql` - Database trigger function
