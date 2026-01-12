# Supabase Functions Analysis - Issues & Recommendations

## Overview

This document analyzes all Supabase database functions in the codebase and identifies potential issues, security concerns, and improvements.

## Functions Identified

1. `handle_new_user()` - Trigger function for user creation
2. `handle_updated_at()` - Trigger function for timestamp updates
3. `is_admin_user(user_uuid uuid)` - Admin status check helper
4. `get_event_bookings_count(event_uuid uuid)` - Event booking count utility
5. `create_booking_safe(p_user_id uuid, p_event_id uuid)` - Atomic booking creation

---

## 🔴 Critical Issues

### 1. Missing Function in Main Schema
**Severity:** Critical  
**Function:** `create_booking_safe`  
**Location:** Referenced in `lib/api/bookings.ts` but not in `supabase/schema.sql`

**Problem:**
- The function is defined in `supabase/fix_critical_issues.sql` but not in the main schema
- If schema is applied fresh, the function won't exist
- Application will fail when trying to create bookings

**Current State:**
```sql
-- Only exists in fix_critical_issues.sql, not in schema.sql
create or replace function public.create_booking_safe(...)
```

**Fix Required:**
- Add `create_booking_safe` function to `supabase/schema.sql`
- Or ensure `fix_critical_issues.sql` is always run after schema

**Impact:** Application crashes when users try to book events

---

### 2. Security Definer Functions Without Input Validation
**Severity:** Critical  
**Functions:** `create_booking_safe`, `is_admin_user`, `get_event_bookings_count`

**Problem:**
Security definer functions run with elevated privileges and bypass RLS. They should validate inputs to prevent:
- SQL injection (though parameterized queries help)
- Invalid UUIDs causing errors
- Malicious input causing unexpected behavior

**Current State:**
```sql
-- No UUID validation
create or replace function public.create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
)
```

**Issues:**
1. **No NULL checks**: Functions don't validate that UUIDs are not NULL
2. **No format validation**: UUIDs could be malformed (PostgreSQL will error, but not gracefully)
3. **No authorization checks**: `create_booking_safe` doesn't verify `p_user_id = auth.uid()`

**Fix Required:**
```sql
create or replace function public.create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
)
returns jsonb as $$
declare
  v_current_user_id uuid;
begin
  -- Validate inputs
  if p_user_id is null or p_event_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid input: user_id and event_id are required',
      'booking_id', null
    );
  end if;
  
  -- Verify user is creating booking for themselves
  v_current_user_id := auth.uid();
  if v_current_user_id is null or v_current_user_id != p_user_id then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: can only create bookings for yourself',
      'booking_id', null
    );
  end if;
  
  -- Rest of function...
end;
$$ language plpgsql security definer;
```

**Impact:** Security vulnerability - users could potentially create bookings for other users

---

### 3. Race Condition in Booking Count Check
**Severity:** High  
**Function:** `create_booking_safe`

**Problem:**
The function checks capacity AFTER locking, but there's a window where:
1. Lock is acquired on bookings
2. Event is locked
3. Count is checked
4. Booking is created

Between steps 3-4, another transaction could have created a booking.

**Current Code:**
```sql
-- Count current confirmed bookings (within the same transaction)
select count(*) into v_current_count
from public.bookings
where event_id = p_event_id
  and status = 'confirmed';

-- Check capacity
if v_current_count >= v_max_capacity then
  return jsonb_build_object(...);
end if;

-- Create booking atomically
insert into public.bookings (user_id, event_id, status)
values (p_user_id, p_event_id, 'confirmed')
```

**Issue:**
- The count happens AFTER the lock, but the insert happens later
- Two transactions could both pass the capacity check
- The unique constraint prevents duplicates, but doesn't prevent overbooking

**Fix Required:**
Use a CHECK constraint or trigger to enforce capacity at the database level, OR use a more atomic approach:

```sql
-- Better approach: Check capacity as part of INSERT with subquery
insert into public.bookings (user_id, event_id, status)
select p_user_id, p_event_id, 'confirmed'
where (
  select count(*) 
  from public.bookings 
  where event_id = p_event_id 
    and status = 'confirmed'
) < (
  select max_capacity 
  from public.events 
  where id = p_event_id
)
returning id into v_booking_id;

if v_booking_id is null then
  return jsonb_build_object(
    'success', false,
    'error', 'Event is fully booked',
    'booking_id', null
  );
end if;
```

**Impact:** Potential overbooking if multiple users book simultaneously

---

## 🟠 High-Priority Issues

### 4. Unused Function
**Severity:** Medium  
**Function:** `get_event_bookings_count`

**Problem:**
- Function is defined in schema but never used
- Application code uses direct queries instead
- Dead code that should be removed or utilized

**Current State:**
```sql
-- Defined in schema.sql
create or replace function public.get_event_bookings_count(event_uuid uuid)
returns integer as $$
begin
  return (
    select count(*)
    from public.bookings
    where event_id = event_uuid
    and status = 'confirmed'
  );
end;
$$ language plpgsql security definer;
```

**Usage:**
- `lib/api/bookings.ts` uses direct query: `select('id', { count: 'exact', head: true })`
- `app/events/book/[id]/page.tsx` uses direct query
- `app/events/page.tsx` fetches all bookings and counts in JavaScript

**Recommendation:**
- Either use the function consistently across the codebase
- Or remove it to reduce maintenance burden

**Impact:** Code inconsistency, potential performance issues (multiple queries vs single function call)

---

### 5. Missing Error Context in Trigger Function
**Severity:** Medium  
**Function:** `handle_new_user`

**Problem:**
The function catches all exceptions but only logs a warning. This makes debugging difficult in production.

**Current Code:**
```sql
exception
  when others then
    raise warning 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    return new;
end;
```

**Issues:**
1. Warning might not be visible in application logs
2. No structured error logging
3. No distinction between different error types
4. Returns success even on failure (by design, but could mask issues)

**Fix Required:**
```sql
exception
  when unique_violation then
    -- Profile already exists, this is OK
    raise notice 'User profile already exists: %', new.id;
    return new;
  when foreign_key_violation then
    raise warning 'Foreign key violation in handle_new_user for user %: %', new.id, SQLERRM;
    return new;
  when others then
    -- Log full error details
    raise warning 'Unexpected error in handle_new_user for user %: % (SQLSTATE: %)', 
      new.id, SQLERRM, SQLSTATE;
    -- Consider logging to a dedicated errors table
    return new;
end;
```

**Impact:** Difficult to debug registration issues in production

---

### 6. No Transaction Control in create_booking_safe
**Severity:** Medium  
**Function:** `create_booking_safe`

**Problem:**
Function uses `FOR UPDATE` locks but doesn't explicitly control transaction boundaries. If called from a transaction that rolls back, locks could be held longer than necessary.

**Current State:**
```sql
select id into v_existing_booking_id
from public.bookings
where user_id = p_user_id
  and event_id = p_event_id
  and status = 'confirmed'
for update;
```

**Issues:**
- No explicit transaction management
- Locks held for duration of outer transaction
- Could cause deadlocks if not careful

**Recommendation:**
- Document that function should be called in its own transaction
- Or add explicit `BEGIN/COMMIT` (but this changes behavior)
- Add timeout handling

**Impact:** Potential deadlocks or performance issues under high concurrency

---

## 🟡 Medium-Priority Issues

### 7. Missing Index Usage Optimization
**Severity:** Low-Medium  
**Function:** `create_booking_safe`

**Problem:**
The function queries bookings multiple times but doesn't ensure indexes are used optimally.

**Current Queries:**
```sql
-- Query 1: Check existing booking
select id into v_existing_booking_id
from public.bookings
where user_id = p_user_id
  and event_id = p_event_id
  and status = 'confirmed'
for update;

-- Query 2: Count bookings
select count(*) into v_current_count
from public.bookings
where event_id = p_event_id
  and status = 'confirmed';
```

**Issues:**
- Query 1 uses composite key (user_id, event_id, status) - needs index
- Query 2 uses (event_id, status) - needs index
- Schema has individual indexes but not composite ones

**Current Indexes:**
```sql
create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_event_id on public.bookings(event_id);
create index idx_bookings_status on public.bookings(status);
```

**Fix Required:**
Add composite indexes (or verify existing ones from fix_critical_issues.sql):
```sql
-- From fix_critical_issues.sql (should be in schema.sql)
create unique index idx_bookings_user_event_confirmed 
on public.bookings(user_id, event_id) 
where status = 'confirmed';

create index idx_bookings_event_status 
on public.bookings(event_id, status) 
where status = 'confirmed';
```

**Impact:** Slower queries under load, especially with many bookings

---

### 8. No Function-Level Permissions
**Severity:** Low  
**Functions:** All

**Problem:**
Functions are created with default permissions. Should explicitly grant execute permissions to authenticated users.

**Current State:**
```sql
create or replace function public.create_booking_safe(...)
$$ language plpgsql security definer;
-- No explicit GRANT statement
```

**Fix Required:**
```sql
-- After creating function
grant execute on function public.create_booking_safe(uuid, uuid) to authenticated;
grant execute on function public.get_event_bookings_count(uuid) to authenticated;
grant execute on function public.is_admin_user(uuid) to authenticated;
```

**Impact:** Functions might not be accessible if default permissions change

---

### 9. Missing Function Documentation
**Severity:** Low  
**Functions:** All

**Problem:**
Functions lack inline documentation explaining:
- Purpose
- Parameters
- Return values
- Side effects
- Error conditions

**Fix Required:**
Add comments to all functions:
```sql
/**
 * Creates a booking atomically, preventing race conditions and overbooking.
 * 
 * @param p_user_id - UUID of the user creating the booking
 * @param p_event_id - UUID of the event to book
 * @returns JSONB with success flag, error message (if any), and booking_id
 * 
 * Errors:
 * - Returns success=false if event is full
 * - Returns success=false if user already booked
 * - Returns success=false if event not found
 * - Returns success=false if event is in the past
 */
create or replace function public.create_booking_safe(...)
```

**Impact:** Difficult for developers to understand function behavior

---

## ✅ Good Practices Found

1. **Security Definer Used Correctly**: Functions that need to bypass RLS use `security definer` appropriately
2. **Error Handling**: Functions have exception handling
3. **Atomic Operations**: `create_booking_safe` uses locks to prevent race conditions
4. **Stable Functions**: `is_admin_user` is marked as `stable` for query optimization

---

## 📋 Summary of Required Fixes

### Immediate Actions (Critical)
1. ✅ Add `create_booking_safe` to `supabase/schema.sql`
2. ✅ Add input validation to `create_booking_safe` (NULL checks, auth.uid() verification)
3. ✅ Fix race condition in capacity check

### High Priority
4. ✅ Improve error logging in `handle_new_user`
5. ✅ Document transaction requirements for `create_booking_safe`
6. ✅ Decide on `get_event_bookings_count` - use it or remove it

### Medium Priority
7. ✅ Verify composite indexes exist for booking queries
8. ✅ Add explicit GRANT statements for function permissions
9. ✅ Add inline documentation to all functions

---

## Testing Recommendations

1. **Concurrency Testing**: Test `create_booking_safe` with 10+ simultaneous bookings
2. **Security Testing**: Attempt to create bookings for other users
3. **Error Testing**: Test with NULL UUIDs, invalid UUIDs, non-existent events
4. **Performance Testing**: Test booking count queries under load
5. **Integration Testing**: Verify trigger functions work correctly during signup

---

## Related Files

- `supabase/schema.sql` - Main schema (missing create_booking_safe)
- `supabase/fix_critical_issues.sql` - Contains create_booking_safe definition
- `lib/api/bookings.ts` - Uses create_booking_safe
- `documentation/RLS_ISSUES_ANALYSIS.md` - Related RLS issues
