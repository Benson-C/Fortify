-- Add table + trigger to persist pre-exercise screening answers at registration.
-- This expects the app to pass `pre_exercise_screening` in auth signup metadata:
-- supabase.auth.signUp({ options: { data: { pre_exercise_screening: {...} }}})
--
-- Safe to run multiple times (idempotent-ish).

-- 1) Table to store responses (1 row per user)
create table if not exists public.pre_exercise_screenings (
  user_id uuid references auth.users(id) on delete cascade primary key,

  submitted_at timestamp with time zone,
  consent_confirmed boolean not null default false,
  fitness_level text,

  q1_yes boolean,
  q1_details text,
  q2_yes boolean,
  q2_details text,
  q3_yes boolean,
  q3_details text,
  q4_yes boolean,
  q4_details text,
  q5_yes boolean,
  q5_details text,
  q6_yes boolean,
  q6_details text,
  q7_yes boolean,
  q7_details text,
  q8_yes boolean,
  q8_details text,

  -- Keep the original payload for auditing / future-proofing
  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2) Data integrity constraint for question 9
alter table public.pre_exercise_screenings
  drop constraint if exists pre_exercise_screenings_fitness_level_check;
alter table public.pre_exercise_screenings
  add constraint pre_exercise_screenings_fitness_level_check
  check (
    fitness_level is null
    or fitness_level in ('very low', 'low', 'moderate', 'high')
  );

-- 3) Keep updated_at current (reuses existing public.handle_updated_at())
drop trigger if exists set_updated_at_pre_exercise_screenings on public.pre_exercise_screenings;
create trigger set_updated_at_pre_exercise_screenings
  before update on public.pre_exercise_screenings
  for each row execute procedure public.handle_updated_at();

-- 4) Enable RLS
alter table public.pre_exercise_screenings enable row level security;

-- 5) Policies: user can read their own; admins can read all
drop policy if exists "Users can view their own pre-exercise screening" on public.pre_exercise_screenings;
create policy "Users can view their own pre-exercise screening"
  on public.pre_exercise_screenings for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all pre-exercise screenings" on public.pre_exercise_screenings;
create policy "Admins can view all pre-exercise screenings"
  on public.pre_exercise_screenings for select
  using (public.is_admin_user(auth.uid()));

-- Optional: allow admins to delete (for cleanup/testing)
drop policy if exists "Admins can delete pre-exercise screenings" on public.pre_exercise_screenings;
create policy "Admins can delete pre-exercise screenings"
  on public.pre_exercise_screenings for delete
  using (public.is_admin_user(auth.uid()));

-- 6) Make sure authenticated role can select (RLS still applies)
grant select on public.pre_exercise_screenings to authenticated;

-- 7) Trigger function: copy screening metadata from auth.users into public.pre_exercise_screenings
create or replace function public.handle_new_user_screening()
returns trigger as $$
declare
  screening jsonb;
  questions jsonb;
begin
  screening := new.raw_user_meta_data->'pre_exercise_screening';
  if screening is null then
    return new;
  end if;

  questions := coalesce(screening->'questions', '[]'::jsonb);

  insert into public.pre_exercise_screenings (
    user_id,
    submitted_at,
    consent_confirmed,
    fitness_level,
    q1_yes, q1_details,
    q2_yes, q2_details,
    q3_yes, q3_details,
    q4_yes, q4_details,
    q5_yes, q5_details,
    q6_yes, q6_details,
    q7_yes, q7_details,
    q8_yes, q8_details,
    raw_payload
  ) values (
    new.id,
    nullif(screening->>'submitted_at', '')::timestamptz,
    coalesce((screening->>'consent_confirmed')::boolean, false),
    nullif(screening->>'fitness_level', ''),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 1 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 1 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 2 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 2 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 3 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 3 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 4 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 4 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 5 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 5 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 6 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 6 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 7 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 7 limit 1),

    (select (q->>'answer')::boolean from jsonb_array_elements(questions) q where (q->>'number')::int = 8 limit 1),
    (select nullif(q->>'details', '') from jsonb_array_elements(questions) q where (q->>'number')::int = 8 limit 1),

    screening
  )
  on conflict (user_id) do update set
    submitted_at = excluded.submitted_at,
    consent_confirmed = excluded.consent_confirmed,
    fitness_level = excluded.fitness_level,
    q1_yes = excluded.q1_yes,
    q1_details = excluded.q1_details,
    q2_yes = excluded.q2_yes,
    q2_details = excluded.q2_details,
    q3_yes = excluded.q3_yes,
    q3_details = excluded.q3_details,
    q4_yes = excluded.q4_yes,
    q4_details = excluded.q4_details,
    q5_yes = excluded.q5_yes,
    q5_details = excluded.q5_details,
    q6_yes = excluded.q6_yes,
    q6_details = excluded.q6_details,
    q7_yes = excluded.q7_yes,
    q7_details = excluded.q7_details,
    q8_yes = excluded.q8_yes,
    q8_details = excluded.q8_details,
    raw_payload = excluded.raw_payload;

  return new;
exception
  when others then
    raise warning 'Error in handle_new_user_screening for user %: % (SQLSTATE: %)',
      new.id, SQLERRM, SQLSTATE;
    return new;
end;
$$ language plpgsql security definer;

-- 8) Trigger: run after auth.users insert (registration)
drop trigger if exists on_auth_user_created_screening on auth.users;
create trigger on_auth_user_created_screening
  after insert on auth.users
  for each row execute procedure public.handle_new_user_screening();

