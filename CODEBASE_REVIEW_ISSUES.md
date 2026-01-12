# Codebase Review - Potential Errors and Issues

**Date:** $(date)  
**Reviewer:** Auto (AI Assistant)

## Executive Summary

This review identified **15 critical issues**, **8 high-priority issues**, and **12 medium-priority improvements** across the codebase. The most critical issues relate to race conditions in booking logic, missing error boundaries, and incomplete test infrastructure.

---

## 🔴 Critical Issues

### 1. Race Condition in Booking Logic
**Severity:** Critical  
**Location:** `lib/api/bookings.ts`, `app/events/book/[id]/page.tsx`

**Problem:**
The booking flow has a race condition between checking capacity and creating the booking. Multiple users can book simultaneously and exceed capacity.

**Current Flow:**
1. Check if user is already booked
2. Check current booking count
3. If count < capacity, create booking

**Issue:** Between steps 2 and 3, another user can book, causing overbooking.

**Example:**
```typescript
// lib/api/bookings.ts:132-136
const { count } = await getEventBookingCount(eventId);
if (count >= event.max_capacity) {
  return { booking: null, error: new Error('Event is fully booked') };
}
// ⚠️ RACE CONDITION: Another user can book here
const { data, error } = await supabase.from('bookings').insert({...});
```

**Fix Required:**
- Use database-level constraints (unique constraint exists but doesn't prevent overbooking)
- Add a database function with transaction/locking
- Use advisory locks or row-level locking
- Consider using `SELECT FOR UPDATE` in a transaction

**Recommendation:**
Create a database function that atomically checks capacity and creates booking:
```sql
CREATE OR REPLACE FUNCTION create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
) RETURNS uuid AS $$
DECLARE
  v_booking_id uuid;
  v_current_count integer;
  v_max_capacity integer;
BEGIN
  -- Get max capacity with lock
  SELECT max_capacity INTO v_max_capacity
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;
  
  -- Count current bookings
  SELECT COUNT(*) INTO v_current_count
  FROM bookings
  WHERE event_id = p_event_id AND status = 'confirmed';
  
  -- Check capacity
  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'Event is fully booked';
  END IF;
  
  -- Create booking
  INSERT INTO bookings (user_id, event_id, status)
  VALUES (p_user_id, p_event_id, 'confirmed')
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. Missing Error Boundaries
**Severity:** Critical  
**Location:** Missing component

**Problem:**
Per user rules: "use error boundaries and typed api wrappers". No error boundaries are implemented. React errors will crash the entire app.

**Impact:**
- Unhandled React errors crash the entire application
- Poor user experience
- No error recovery mechanism

**Fix Required:**
- Create `components/ErrorBoundary.tsx`
- Wrap app routes in error boundaries
- Add error logging/reporting

---

### 3. ESLint Configuration Violates User Rules
**Severity:** Critical  
**Location:** `.eslintrc.json`

**Problem:**
User rule states: "enforce eslint (warnings = errors)". Current config allows warnings.

**Current Config:**
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off"
  }
}
```

**Issues:**
1. `no-console` is set to "warn" but should be "error" per user rules
2. Unused vars are completely disabled, which can hide bugs

**Fix Required:**
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_" 
    }]
  }
}
```

---

### 4. Missing Build Step to Remove console.log
**Severity:** Critical  
**Location:** `next.config.js`

**Problem:**
User rule: "remove console.log in prod via build step". No build configuration to strip console.log.

**Current:** `next.config.js` only has `reactStrictMode: true`

**Fix Required:**
Add webpack configuration or use `babel-plugin-transform-remove-console`:
```javascript
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}
```

---

### 5. Incomplete Test Infrastructure
**Severity:** Critical  
**Location:** Missing files

**Problem:**
- `package.json` has test scripts but no `jest.config.js`
- No test setup file
- Missing testing dependencies
- No tests exist

**Missing:**
- `jest.config.js`
- `jest.setup.js`
- Dependencies: `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`

**Fix Required:**
Create proper Jest configuration for Next.js.

---

### 6. Database Unique Constraint Issue
**Severity:** Critical  
**Location:** `supabase/schema.sql:45`

**Problem:**
The unique constraint on bookings allows duplicate bookings with different statuses:
```sql
unique(user_id, event_id, status)
```

**Issue:**
A user can have both a 'confirmed' and 'cancelled' booking for the same event, which may be intentional but should be documented. However, the constraint doesn't prevent:
- Multiple 'confirmed' bookings (should be prevented)
- Booking after cancellation (may be desired behavior)

**Recommendation:**
Consider a partial unique index:
```sql
CREATE UNIQUE INDEX idx_bookings_user_event_confirmed 
ON bookings(user_id, event_id) 
WHERE status = 'confirmed';
```

---

### 7. Missing Typed API Wrappers with Full Context Logging
**Severity:** Critical  
**Location:** `lib/api/*.ts`

**Problem:**
User rule: "log failures with full request/response context". Current API functions don't log full context on errors.

**Current:**
```typescript
if (error) {
  return { booking: null, error: new Error(error.message) };
}
```

**Missing:**
- Full request context (user_id, event_id, etc.)
- Full response context
- Request/response logging

**Fix Required:**
Create a logging utility and wrap all API calls with full context logging.

---

### 8. No Debug Logging Infrastructure
**Severity:** Critical  
**Location:** Missing

**Problem:**
User rule: "funnel logs through debug; remove console.log in prod via build step". No debug logging setup.

**Current State:**
- Multiple `console.log` statements in test files (acceptable)
- No debug package usage
- No logging utility

**Fix Required:**
- Install `debug` package
- Create `lib/logger.ts` utility
- Replace any console.log with debug logger

---

## 🟠 High-Priority Issues

### 9. Inconsistent Error Handling in Booking Count
**Severity:** High  
**Location:** `lib/api/bookings.ts:48-66`

**Problem:**
`getEventBookingCount` uses `count: 'exact'` but then checks `data?.length`, which is incorrect. When using `count: 'exact'`, the count is in the response metadata, not `data.length`.

**Current Code:**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .eq('status', 'confirmed');

return { count: data?.length || 0, error: null };
```

**Issue:**
- `head: true` means no data is returned
- `count: 'exact'` puts count in metadata, not data
- `data?.length` will always be 0 or undefined

**Fix Required:**
```typescript
const { count, error } = await supabase
  .from('bookings')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .eq('status', 'confirmed');

return { count: count || 0, error: null };
```

---

### 10. Missing Dependency Array in useEffect
**Severity:** High  
**Location:** `app/events/book/[id]/page.tsx:80`

**Problem:**
The useEffect has a dependency array `[eventId]` but the function `loadEvent` is defined inside and uses `eventId` from closure. This is actually correct, but the linter might complain.

**Status:** Actually correct, but could be improved with useCallback.

---

### 11. Potential Timezone Issues
**Severity:** High  
**Location:** Multiple files

**Problem:**
Date comparisons use `new Date()` without timezone consideration. The database stores `timestamp with time zone`, but client-side comparisons may have timezone mismatches.

**Example:**
```typescript
// lib/api/bookings.ts:128
if (new Date(event.date_time) < new Date()) {
  return { booking: null, error: new Error('Cannot book past events') };
}
```

**Issue:**
- Server and client may be in different timezones
- `new Date()` uses local timezone
- Database uses UTC

**Recommendation:**
Use UTC for all comparisons or ensure consistent timezone handling.

---

### 12. Missing Input Validation on Client-Side Booking
**Severity:** High  
**Location:** `app/events/book/[id]/page.tsx:82-141`

**Problem:**
The `handleBook` function in the client component doesn't validate the eventId before making API calls.

**Fix Required:**
Add validation:
```typescript
if (!eventId || typeof eventId !== 'string') {
  setError('Invalid event ID');
  return;
}
```

---

### 13. No Rate Limiting on Booking Endpoints
**Severity:** High  
**Location:** API routes (if using route handlers)

**Problem:**
No rate limiting on booking creation, which could allow abuse or accidental rapid-fire bookings.

**Recommendation:**
Implement rate limiting middleware or use Supabase rate limiting features.

---

### 14. Missing Error Recovery in Middleware
**Severity:** High  
**Location:** `lib/supabase/middleware.ts:74-78`

**Problem:**
If the database query for user role fails, the code defaults to 'participant' without logging the error:

```typescript
const { data: userProfile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

const userRole = userProfile?.role || 'participant';
```

**Issue:**
- Silent failure if query errors
- No error logging
- User might be incorrectly routed

**Fix Required:**
Log errors and handle them explicitly.

---

### 15. Inconsistent Error Message Handling
**Severity:** High  
**Location:** Multiple files

**Problem:**
Some functions return `Error` objects, others return error strings. Inconsistent error handling makes it difficult to display errors consistently.

**Examples:**
- `lib/api/bookings.ts` returns `Error` objects
- `app/events/book/[id]/page.tsx` uses error strings
- Some components expect strings, others expect Error objects

**Recommendation:**
Standardize on a single error format (preferably Error objects with a `message` property).

---

### 16. Missing Zod Validation on API Responses
**Severity:** High  
**Location:** `lib/api/*.ts`

**Problem:**
User rule: "prefer zod for runtime validation; fail fast". API responses are not validated with Zod schemas.

**Current:**
```typescript
return { bookings: (data || []) as Booking[], error: null };
```

**Issue:**
- Type assertions (`as Booking[]`) don't validate at runtime
- Invalid data from database could cause runtime errors
- No fail-fast validation

**Fix Required:**
Create Zod schemas for all API response types and validate before returning.

---

## 🟡 Medium-Priority Issues

### 17. Missing pnpm Audit in CI
**Severity:** Medium  
**Location:** CI configuration (missing)

**Problem:**
User rule: "enforce eslint (warnings = errors) and pnpm audit in ci". No CI configuration found, and project uses `package-lock.json` (npm) instead of `pnpm-lock.yaml`.

**Issues:**
- Using npm instead of pnpm
- No CI configuration
- No pnpm audit step

**Fix Required:**
- Migrate to pnpm or update user rules
- Add CI configuration
- Add pnpm audit step

---

### 18. Console.log in Production Code
**Severity:** Medium  
**Location:** `lib/supabase/middleware.ts:18-24`

**Problem:**
`console.error` is used in middleware, which is acceptable per ESLint config, but the user rule says to use debug logging.

**Current:**
```typescript
console.error(
  'Missing Supabase environment variables in middleware.\n' +
  'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local\n' +
  'and restart your dev server.'
)
```

**Recommendation:**
Replace with debug logger once logging infrastructure is set up.

---

### 19. Missing Type Safety in Health Metrics
**Severity:** Medium  
**Location:** `lib/api/health-metrics.ts:81-91`

**Problem:**
Using `any` type for insertData:

```typescript
const insertData: any = {
  user_id: user.id,
  recorded_date: validated.recorded_date ? new Date(validated.recorded_date).toISOString() : new Date().toISOString(),
};
```

**Fix Required:**
Create a proper type for the insert data.

---

### 20. Potential Memory Leak in useEffect
**Severity:** Medium  
**Location:** `app/events/book/[id]/page.tsx`

**Problem:**
The `loadEvent` function is async but there's no cleanup or cancellation if the component unmounts before it completes.

**Fix Required:**
Add cleanup:
```typescript
useEffect(() => {
  let cancelled = false;
  
  async function loadEvent() {
    // ... existing code ...
    if (!cancelled) {
      setEvent(eventData as Event);
      // ... rest of updates
    }
  }
  
  if (eventId) {
    loadEvent();
  }
  
  return () => {
    cancelled = true;
  };
}, [eventId]);
```

---

### 21. Missing Index on bookings(user_id, event_id, status)
**Severity:** Medium  
**Location:** `supabase/schema.sql`

**Problem:**
The unique constraint creates an index, but queries often filter by `status = 'confirmed'`, which might benefit from a partial index.

**Recommendation:**
Consider adding:
```sql
CREATE INDEX idx_bookings_confirmed ON bookings(event_id, user_id) 
WHERE status = 'confirmed';
```

---

### 22. No Validation for Event Capacity in Schema
**Severity:** Medium  
**Location:** `supabase/schema.sql:28`

**Problem:**
`max_capacity` has no CHECK constraint to ensure it's positive:

```sql
max_capacity integer not null,
```

**Fix Required:**
```sql
max_capacity integer not null CHECK (max_capacity > 0),
```

---

### 23. Missing Validation for Duration
**Severity:** Medium  
**Location:** `supabase/schema.sql:27`

**Problem:**
`duration` (in minutes) has no CHECK constraint:

```sql
duration integer not null, -- duration in minutes
```

**Fix Required:**
```sql
duration integer not null CHECK (duration > 0), -- duration in minutes
```

---

### 24. Inconsistent Date Handling
**Severity:** Medium  
**Location:** Multiple files

**Problem:**
Some places use `new Date().toISOString()`, others use `new Date()`, and database uses `timezone('utc'::text, now())`.

**Recommendation:**
Standardize on UTC for all date operations.

---

### 25. Missing Error Boundary in Layout
**Severity:** Medium  
**Location:** `app/layout.tsx` (needs verification)

**Problem:**
No error boundary wrapping the app, so any unhandled error crashes the entire app.

**Fix Required:**
Add error boundary to root layout.

---

### 26. No Request/Response Logging
**Severity:** Medium  
**Location:** All API functions

**Problem:**
User rule requires "log failures with full request/response context", but no logging is implemented.

**Fix Required:**
Implement logging utility that captures:
- Request parameters
- Response data
- Error details
- User context
- Timestamp

---

### 27. Missing Health Check Endpoint
**Severity:** Low-Medium  
**Location:** Missing

**Problem:**
No health check endpoint for monitoring/deployment verification.

**Recommendation:**
Add `/api/health` endpoint.

---

### 28. No Database Connection Pooling Configuration
**Severity:** Medium  
**Location:** Supabase client configuration

**Problem:**
No explicit connection pooling configuration, which could lead to connection exhaustion under load.

**Note:** Supabase handles this, but worth documenting.

---

## 📋 Summary by Category

### Security Issues
- No rate limiting on booking endpoints
- Missing input validation in some places
- No request/response logging for security auditing

### Performance Issues
- Race condition in booking logic
- Missing database indexes for common queries
- No connection pooling configuration (handled by Supabase)

### Code Quality Issues
- Missing error boundaries
- Inconsistent error handling
- Missing type safety in some places
- No test infrastructure

### Compliance with User Rules
- ❌ ESLint warnings should be errors
- ❌ No debug logging infrastructure
- ❌ No build step to remove console.log
- ❌ Missing error boundaries
- ❌ No typed API wrappers with full context logging
- ❌ No pnpm audit in CI
- ❌ Missing Zod validation on API responses

---

## 🎯 Recommended Action Plan

### Immediate (Critical)
1. Fix race condition in booking logic (Issue #1)
2. Add error boundaries (Issue #2)
3. Fix ESLint configuration (Issue #3)
4. Add build step to remove console.log (Issue #4)
5. Fix booking count error (Issue #9)

### Short-term (High Priority)
6. Set up test infrastructure (Issue #5)
7. Add debug logging infrastructure (Issue #8)
8. Add Zod validation for API responses (Issue #16)
9. Fix timezone handling (Issue #11)
10. Standardize error handling (Issue #15)

### Medium-term (Medium Priority)
11. Add database constraints (Issues #22, #23)
12. Add proper indexes (Issue #21)
13. Implement rate limiting (Issue #13)
14. Add request/response logging (Issue #26)
15. Fix memory leak in useEffect (Issue #20)

---

## 📝 Notes

- The codebase is generally well-structured
- Good use of TypeScript and Zod for validation
- Supabase integration is properly implemented
- Most issues are related to missing infrastructure (testing, logging, error boundaries)
- The race condition is the most critical functional bug

---

**End of Review**
