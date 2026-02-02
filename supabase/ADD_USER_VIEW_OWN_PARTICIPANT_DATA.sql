-- Allow users to view their own event participant data (for missions panel)
-- This policy allows users to see their own attendance status

drop policy if exists "Users can view their own participant data" on public.event_participant_data;
create policy "Users can view their own participant data"
  on public.event_participant_data for select
  using (auth.uid() = user_id);
