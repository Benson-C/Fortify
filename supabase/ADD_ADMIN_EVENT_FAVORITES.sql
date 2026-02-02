-- Add table for admin event favorites
-- Allows admins to star/favorite events for quick access

-- 1) Table to store admin favorites (many-to-many: admin -> events)
create table if not exists public.admin_event_favorites (
  admin_id uuid references public.users(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (admin_id, event_id)
);

-- 2) Indexes for fast lookups
create index if not exists idx_admin_event_favorites_admin_id on public.admin_event_favorites(admin_id);
create index if not exists idx_admin_event_favorites_event_id on public.admin_event_favorites(event_id);

-- 3) Enable RLS
alter table public.admin_event_favorites enable row level security;

-- 4) Policies: admins can manage their own favorites
drop policy if exists "Admins can view their own favorites" on public.admin_event_favorites;
create policy "Admins can view their own favorites"
  on public.admin_event_favorites for select
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Admins can insert their own favorites" on public.admin_event_favorites;
create policy "Admins can insert their own favorites"
  on public.admin_event_favorites for insert
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Admins can delete their own favorites" on public.admin_event_favorites;
create policy "Admins can delete their own favorites"
  on public.admin_event_favorites for delete
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- 5) Grant permissions
grant select, insert, delete on public.admin_event_favorites to authenticated;
