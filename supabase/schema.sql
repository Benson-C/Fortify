-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type user_role as enum ('participant', 'admin');
create type booking_status as enum ('confirmed', 'cancelled');
create type event_type as enum ('cardio', 'strength', 'yoga', 'pilates', 'crossfit', 'other');

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  phone_number text,
  id_number text,
  role user_role default 'participant' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, phone_number, id_number, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    nullif(new.raw_user_meta_data->>'id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  );
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
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.health_metrics enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
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
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update events"
  on public.events for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete events"
  on public.events for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
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
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
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
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Indexes for better query performance
create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_event_id on public.bookings(event_id);
create index idx_bookings_status on public.bookings(status);
create index idx_events_date_time on public.events(date_time);
create index idx_health_metrics_user_id on public.health_metrics(user_id);
create index idx_health_metrics_recorded_date on public.health_metrics(recorded_date);
create index idx_users_role on public.users(role);

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
