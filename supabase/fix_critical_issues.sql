-- Fix Critical Issues: Race Condition and Database Constraints
-- Run this after schema.sql

-- 1. Create atomic booking function to prevent race conditions
-- This function atomically checks capacity and creates booking
create or replace function public.create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
)
returns jsonb as $$
declare
  v_booking_id uuid;
  v_current_count integer;
  v_max_capacity integer;
  v_event_date timestamp with time zone;
  v_existing_booking_id uuid;
  v_result jsonb;
begin
  -- Check if user is already booked (with lock to prevent race condition)
  select id into v_existing_booking_id
  from public.bookings
  where user_id = p_user_id
    and event_id = p_event_id
    and status = 'confirmed'
  for update;
  
  if v_existing_booking_id is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'You are already booked for this event',
      'booking_id', null
    );
  end if;
  
  -- Get event details with lock to prevent concurrent modifications
  select max_capacity, date_time into v_max_capacity, v_event_date
  from public.events
  where id = p_event_id
  for update;
  
  if v_max_capacity is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Event not found',
      'booking_id', null
    );
  end if;
  
  -- Check if event is in the past
  if v_event_date < now() then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot book past events',
      'booking_id', null
    );
  end if;
  
  -- Count current confirmed bookings (within the same transaction)
  select count(*) into v_current_count
  from public.bookings
  where event_id = p_event_id
    and status = 'confirmed';
  
  -- Check capacity
  if v_current_count >= v_max_capacity then
    return jsonb_build_object(
      'success', false,
      'error', 'Event is fully booked',
      'booking_id', null
    );
  end if;
  
  -- Create booking atomically
  insert into public.bookings (user_id, event_id, status)
  values (p_user_id, p_event_id, 'confirmed')
  returning id into v_booking_id;
  
  -- Return success with booking ID
  return jsonb_build_object(
    'success', true,
    'error', null,
    'booking_id', v_booking_id
  );
exception
  when unique_violation then
    -- Handle unique constraint violation (user already has a booking)
    return jsonb_build_object(
      'success', false,
      'error', 'You are already booked for this event',
      'booking_id', null
    );
  when others then
    -- Log and return error
    raise warning 'Error in create_booking_safe: %', SQLERRM;
    return jsonb_build_object(
      'success', false,
      'error', 'Failed to create booking: ' || SQLERRM,
      'booking_id', null
    );
end;
$$ language plpgsql security definer;

-- 2. Add partial unique index to prevent multiple confirmed bookings
-- This replaces the need for the unique constraint on (user_id, event_id, status)
-- and ensures only one confirmed booking per user per event
drop index if exists idx_bookings_user_event_confirmed;
create unique index idx_bookings_user_event_confirmed 
on public.bookings(user_id, event_id) 
where status = 'confirmed';

-- 3. Add CHECK constraints for data integrity
alter table public.events
  add constraint events_max_capacity_positive 
  check (max_capacity > 0);

alter table public.events
  add constraint events_duration_positive 
  check (duration > 0);

-- 4. Add composite index for common booking queries
create index if not exists idx_bookings_event_status 
on public.bookings(event_id, status) 
where status = 'confirmed';
