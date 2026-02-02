-- Restrict bookings so users can only have one confirmed booking at a time
-- for FUN/Assessment Day and DEXA Scan events
-- Touchpoints allow multiple bookings

create or replace function public.create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
)
returns jsonb as $$
declare
  v_booking_id uuid;
  v_max_capacity integer;
  v_event_date timestamp with time zone;
  v_event_type event_type;
  v_existing_booking_id uuid;
  v_current_user_id uuid;
  v_existing_same_type_booking_id uuid;
begin
  -- CRITICAL FIX #1: Validate inputs
  if p_user_id is null or p_event_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid input: user_id and event_id are required',
      'booking_id', null
    );
  end if;
  
  -- CRITICAL FIX #2: Verify user is authenticated and creating booking for themselves
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'booking_id', null
    );
  end if;
  
  if v_current_user_id != p_user_id then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: can only create bookings for yourself',
      'booking_id', null
    );
  end if;
  
  -- Check if user is already booked for this specific event (with lock to prevent race condition)
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
  select max_capacity, date_time, event_type into v_max_capacity, v_event_date, v_event_type
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
  
  -- NEW: Check if user already has a confirmed booking for the same event type
  -- This restriction applies to fun_assessment_day and dexa_scan only
  -- Touchpoints allow multiple bookings
  if v_event_type in ('fun_assessment_day', 'dexa_scan') then
    select b.id into v_existing_same_type_booking_id
    from public.bookings b
    inner join public.events e on e.id = b.event_id
    where b.user_id = p_user_id
      and b.status = 'confirmed'
      and e.event_type = v_event_type
      and e.date_time >= now()  -- Only check future events
    for update;
    
    if v_existing_same_type_booking_id is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'You already have a confirmed booking for a ' || 
                 case v_event_type
                   when 'fun_assessment_day' then 'FUN/Assessment Day'
                   when 'dexa_scan' then 'DEXA Scan'
                   else v_event_type::text
                 end || ' event. Please cancel your existing booking first.',
        'booking_id', null
      );
    end if;
  end if;
  
  -- CRITICAL FIX #3: Atomic capacity check and insert
  -- Use INSERT with subquery WHERE clause to make check and insert atomic
  -- The FOR UPDATE locks ensure no concurrent modifications during this operation
  -- This prevents race conditions where two transactions both pass the capacity check
  insert into public.bookings (user_id, event_id, status)
  select p_user_id, p_event_id, 'confirmed'
  where (
    -- Count bookings within the locked transaction
    -- The event row is locked (FOR UPDATE), preventing concurrent capacity changes
    select count(*)
    from public.bookings
    where event_id = p_event_id
      and status = 'confirmed'
  ) < v_max_capacity
  returning id into v_booking_id;
  
  -- If no row was inserted, capacity was exceeded
  if v_booking_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Event is fully booked',
      'booking_id', null
    );
  end if;
  
  -- Return success with booking ID
  return jsonb_build_object(
    'success', true,
    'error', null,
    'booking_id', v_booking_id
  );
exception
  when unique_violation then
    -- Handle unique constraint violation (user already has a booking)
    -- This can happen if the unique index catches a duplicate
    return jsonb_build_object(
      'success', false,
      'error', 'You are already booked for this event',
      'booking_id', null
    );
  when others then
    -- Log and return error with SQLSTATE for better debugging
    raise warning 'Error in create_booking_safe for user %, event %: % (SQLSTATE: %)', 
      p_user_id, p_event_id, SQLERRM, SQLSTATE;
    return jsonb_build_object(
      'success', false,
      'error', 'Failed to create booking: ' || SQLERRM,
      'booking_id', null
    );
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.create_booking_safe(uuid, uuid) to authenticated;
