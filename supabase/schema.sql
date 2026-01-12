-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
-- Note: user_role enum removed - admins are managed via admin_users table
create type booking_status as enum ('confirmed', 'cancelled');
create type event_type as enum ('cardio', 'strength', 'yoga', 'pilates', 'crossfit', 'other');

-- Users table (extends Supabase auth.users)
-- Note: No role field - all users are equal by default
-- Admins are stored in admin_users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  phone_number text,
  id_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Admin users table (separate from users to avoid RLS recursion)
create table public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.users(id),
  notes text
);

-- Index for fast admin lookups
create index idx_admin_users_user_id on public.admin_users(user_id);

-- Events/Workshops table
create table public.events (
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
create table public.bookings (
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
create table public.health_metrics (
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

-- Triggers for updated_at
create trigger set_updated_at_users
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_events
  before update on public.events
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_bookings
  before update on public.bookings
  for each row execute procedure public.handle_updated_at();

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
  when others then
    -- Log the error for debugging (check Supabase Postgres Logs)
    raise warning 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    -- Still return new to allow auth.users creation to succeed
    -- The fallback code in the app will handle profile creation if trigger fails
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync auth.users with public.users
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

-- Admin users table policies
create policy "Admins can view admin_users"
  on public.admin_users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can insert admin_users"
  on public.admin_users for insert
  with check (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can delete admin_users"
  on public.admin_users for delete
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (
    -- Check if user exists in auth.users (more reliable than auth.uid() after signUp)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
    -- Prevent duplicates
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = users.id
    )
  );

-- Admin policies using admin_users table (no recursion!)
create policy "Admins can view all users"
  on public.users for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Note: The trigger function handle_new_user() uses security definer
-- which bypasses RLS. However, if the trigger fails (e.g., on localhost),
-- the INSERT policy above allows users to create their own profile as a fallback.

-- Events policies
create policy "Anyone can view events"
  on public.events for select
  using (true);

create policy "Admins can create events"
  on public.events for insert
  with check (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can update events"
  on public.events for update
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

create policy "Admins can delete events"
  on public.events for delete
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Bookings policies
create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can create their own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.bookings for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Health Metrics policies
create policy "Users can view their own health metrics"
  on public.health_metrics for select
  using (auth.uid() = user_id);

create policy "Users can insert their own health metrics"
  on public.health_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own health metrics"
  on public.health_metrics for update
  using (auth.uid() = user_id);

create policy "Admins can view all health metrics"
  on public.health_metrics for select
  using (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Indexes for better query performance
create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_event_id on public.bookings(event_id);
create index idx_bookings_status on public.bookings(status);
create index idx_events_date_time on public.events(date_time);
create index idx_health_metrics_user_id on public.health_metrics(user_id);
create index idx_health_metrics_recorded_date on public.health_metrics(recorded_date);
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
