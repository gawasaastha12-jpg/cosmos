-- Step 3: user_progress table with Row Level Security
create table if not exists public.user_progress (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  data           jsonb       not null default '{}'::jsonb,
  schema_version int         not null default 2,
  updated_at     timestamptz not null default now(),
  constraint user_progress_data_size check (pg_column_size(data) < 65536)
);

alter table public.user_progress enable row level security;

-- Grant access to authenticated users (RLS policies restrict to own rows)
grant select, insert, update, delete on table public.user_progress to authenticated;

-- (select auth.uid()) is evaluated once per statement, not per row
create policy "own row: select" on public.user_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own row: insert" on public.user_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own row: update" on public.user_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own row: delete" on public.user_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger user_progress_touch
  before update on public.user_progress
  for each row execute function public.touch_updated_at();
