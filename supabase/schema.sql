-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types (only if they don't exist)
-- Note: user_role enum removed - admins are managed via admin_users table
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('confirmed', 'cancelled');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum ('cardio', 'strength', 'yoga', 'pilates', 'crossfit', 'other');
  end if;
end $$;

-- Users table (extends Supabase auth.users)
-- Note: No role field - all users are equal by default
-- Admins are stored in admin_users table
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  phone_number text,
  id_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Admin users table (separate from users to avoid RLS recursion)
create table if not exists public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.users(id),
  notes text
);

-- Index for fast admin lookups
create index if not exists idx_admin_users_user_id on public.admin_users(user_id);

-- Events/Workshops table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  date_time timestamp with time zone not null,
  duration integer not null, -- duration in minutes
  max_capacity integer not null,
  event_type event_type not null,
  location text,
  instructor_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings table
create table if not exists public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  booking_date timestamp with time zone default timezone('utc'::text, now()) not null,
  status booking_status default 'confirmed' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, event_id, status)
);

-- Health Metrics table
create table if not exists public.health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  recorded_date timestamp with time zone default timezone('utc'::text, now()) not null,
  grip_strength numeric,
  bone_density numeric,
  pushup_count integer,
  heart_rate integer,
  body_fat numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at (drop if exists to make idempotent)
drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
  before update on public.users
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at_events on public.events;
create trigger set_updated_at_events
  before update on public.events
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at_bookings on public.bookings;
create trigger set_updated_at_bookings
  before update on public.bookings
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at_health_metrics on public.health_metrics;
create trigger set_updated_at_health_metrics
  before update on public.health_metrics
  for each row execute procedure public.handle_updated_at();

-- Function to sync auth.users with public.users
-- Note: No role field - admins are managed via admin_users table
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', '')
  )
  on conflict (id) do nothing;  -- Prevent errors if profile already exists
  return new;
exception
  when unique_violation then
    -- Profile already exists, this is OK (can happen with retries)
    raise notice 'User profile already exists: %', new.id;
    return new;
  when foreign_key_violation then
    -- Foreign key violation - log with SQLSTATE for debugging
    raise warning 'Foreign key violation in handle_new_user for user %: % (SQLSTATE: %)', 
      new.id, SQLERRM, SQLSTATE;
    return new;
  when others then
    -- Log full error details for debugging (check Supabase Postgres Logs)
    raise warning 'Unexpected error in handle_new_user for user %: % (SQLSTATE: %)', 
      new.id, SQLERRM, SQLSTATE;
    -- Still return new to allow auth.users creation to succeed
    -- The fallback code in the app will handle profile creation if trigger fails
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync auth.users with public.users (drop if exists to make idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.health_metrics enable row level security;

-- Helper function to check admin status (bypasses RLS to prevent recursion)
create or replace function public.is_admin_user(user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = user_uuid
  );
end;
$$ language plpgsql security definer stable;

-- Admin users table policies (use function to prevent recursion)
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can insert admin_users" on public.admin_users;
create policy "Admins can insert admin_users"
  on public.admin_users for insert
  with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete admin_users" on public.admin_users;
create policy "Admins can delete admin_users"
  on public.admin_users for delete
  using (public.is_admin_user(auth.uid()));

-- Also allow users to check their own admin status (for isAdmin() function)
drop policy if exists "Users can check own admin status" on public.admin_users;
create policy "Users can check own admin status"
  on public.admin_users for select
  using (user_id = auth.uid());

-- Users policies
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Use auth.uid() directly (no table query needed, avoids permission issues)
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    -- Duplicate prevention handled by primary key constraint
  );

-- Admin policies using helper function (no recursion!)
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin_user(auth.uid()));

-- Note: The trigger function handle_new_user() uses security definer
-- which bypasses RLS. However, if the trigger fails (e.g., on localhost),
-- the INSERT policy above allows users to create their own profile as a fallback.

-- Events policies
drop policy if exists "Anyone can view events" on public.events;
create policy "Anyone can view events"
  on public.events for select
  using (true);

drop policy if exists "Admins can create events" on public.events;
create policy "Admins can create events"
  on public.events for insert
  with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin_user(auth.uid()));

-- Bookings policies
drop policy if exists "Users can view their own bookings" on public.bookings;
create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own bookings" on public.bookings;
create policy "Users can create their own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bookings" on public.bookings;
create policy "Users can update their own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin_user(auth.uid()));

-- Health Metrics policies
drop policy if exists "Users can view their own health metrics" on public.health_metrics;
create policy "Users can view their own health metrics"
  on public.health_metrics for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own health metrics" on public.health_metrics;
create policy "Users can insert their own health metrics"
  on public.health_metrics for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own health metrics" on public.health_metrics;
create policy "Users can update their own health metrics"
  on public.health_metrics for update
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all health metrics" on public.health_metrics;
create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (public.is_admin_user(auth.uid()));

-- Indexes for better query performance
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_event_id on public.bookings(event_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_events_date_time on public.events(date_time);
create index if not exists idx_health_metrics_user_id on public.health_metrics(user_id);
create index if not exists idx_health_metrics_recorded_date on public.health_metrics(recorded_date);
-- Note: idx_users_role removed - no role field anymore

-- Function to get current bookings count for an event
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

/**
 * Creates a booking atomically, preventing race conditions and overbooking.
 * 
 * This function:
 * - Validates that the user is authenticated and creating booking for themselves
 * - Checks if user is already booked
 * - Verifies event exists and is not in the past
 * - Atomically checks capacity and creates booking to prevent overbooking
 * - Uses row-level locking to prevent race conditions
 * 
 * @param p_user_id - UUID of the user creating the booking (must match auth.uid())
 * @param p_event_id - UUID of the event to book
 * @returns JSONB with success flag, error message (if any), and booking_id
 * 
 * Errors:
 * - Returns success=false if user_id doesn't match authenticated user
 * - Returns success=false if event is full
 * - Returns success=false if user already booked
 * - Returns success=false if event not found
 * - Returns success=false if event is in the past
 */
create or replace function public.create_booking_safe(
  p_user_id uuid,
  p_event_id uuid
)
returns jsonb as $$
declare
  v_booking_id uuid;
  v_max_capacity integer;
  v_event_date timestamp with time zone;
  v_existing_booking_id uuid;
  v_current_user_id uuid;
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
grant execute on function public.get_event_bookings_count(uuid) to authenticated;
grant execute on function public.is_admin_user(uuid) to authenticated;

-- Additional indexes for booking queries (optimize create_booking_safe performance)
-- Partial unique index to prevent multiple confirmed bookings per user per event
create unique index if not exists idx_bookings_user_event_confirmed 
on public.bookings(user_id, event_id) 
where status = 'confirmed';

-- Composite index for capacity count queries
create index if not exists idx_bookings_event_status 
on public.bookings(event_id, status) 
where status = 'confirmed';

-- CHECK constraints for data integrity
alter table public.events
  drop constraint if exists events_max_capacity_positive;
alter table public.events
  add constraint events_max_capacity_positive 
  check (max_capacity > 0);

alter table public.events
  drop constraint if exists events_duration_positive;
alter table public.events
  add constraint events_duration_positive 
  check (duration > 0);
