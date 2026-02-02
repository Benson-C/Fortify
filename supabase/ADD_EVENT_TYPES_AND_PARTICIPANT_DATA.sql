-- Adds 3 admin event types + per-user data capture for events.
--
-- Event types required by admin UI:
-- - fun_assessment_day  (label: FUN/Assessment Day)
-- - dexa_scan           (label: DEXA Scan)
-- - touchpoints         (label: Touchpoints)
--
-- Also creates a per-event, per-user table to store data entry values.

-- 1) Add enum values to existing event_type
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'event_type' and e.enumlabel = 'fun_assessment_day'
  ) then
    alter type event_type add value 'fun_assessment_day';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'event_type' and e.enumlabel = 'dexa_scan'
  ) then
    alter type event_type add value 'dexa_scan';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'event_type' and e.enumlabel = 'touchpoints'
  ) then
    alter type event_type add value 'touchpoints';
  end if;
end $$;

-- 2) Per-user data entry table (superset of all required fields)
create table if not exists public.event_participant_data (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,

  attendance boolean,

  -- Shared
  grip_strength numeric,
  inbody boolean,

  -- FUN/Assessment Day
  chair_stand_30s integer,
  single_leg_stand numeric,
  up_down_step_count integer,

  -- DEXA
  dexa_scanned boolean,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  primary key (event_id, user_id)
);

-- Keep updated_at current (reuses existing public.handle_updated_at())
drop trigger if exists set_updated_at_event_participant_data on public.event_participant_data;
create trigger set_updated_at_event_participant_data
  before update on public.event_participant_data
  for each row execute procedure public.handle_updated_at();

-- 3) RLS
alter table public.event_participant_data enable row level security;

-- 4) Policies: admins can read/write all event participant data
drop policy if exists "Admins can view event participant data" on public.event_participant_data;
create policy "Admins can view event participant data"
  on public.event_participant_data for select
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can insert event participant data" on public.event_participant_data;
create policy "Admins can insert event participant data"
  on public.event_participant_data for insert
  with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can update event participant data" on public.event_participant_data;
create policy "Admins can update event participant data"
  on public.event_participant_data for update
  using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete event participant data" on public.event_participant_data;
create policy "Admins can delete event participant data"
  on public.event_participant_data for delete
  using (public.is_admin_user(auth.uid()));

grant select, insert, update, delete on public.event_participant_data to authenticated;

