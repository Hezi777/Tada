-- Core data tables: datasets, dataset_files, charts, kpis.
-- Idempotent: safe on a fresh project and on databases where these tables
-- were previously created by hand.

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  rows jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  created_at timestamptz default now()
);

-- v1 additions (no-ops on fresh databases that just created the full table).
alter table public.datasets add column if not exists topic text not null default 'unknown';
alter table public.datasets add column if not exists profile jsonb;
alter table public.datasets add column if not exists content_hash text;
alter table public.datasets add column if not exists storage_path text;

create table if not exists public.dataset_files (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  file_name text not null,
  is_primary boolean not null default false,
  row_count integer not null default 0,
  uploaded_at timestamptz default now()
);

create table if not exists public.charts (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  configs jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  configs jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_dataset_files_dataset_id on public.dataset_files (dataset_id);
create index if not exists idx_charts_dataset_id on public.charts (dataset_id);
create index if not exists idx_kpis_dataset_id on public.kpis (dataset_id);
create index if not exists idx_datasets_user_id on public.datasets (user_id);

-- updated_at maintenance
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists charts_updated_at on public.charts;
create trigger charts_updated_at
  before update on public.charts
  for each row execute function public.update_updated_at();

drop trigger if exists kpis_updated_at on public.kpis;
create trigger kpis_updated_at
  before update on public.kpis
  for each row execute function public.update_updated_at();

grant select, insert, update, delete on public.datasets to authenticated;
grant select, insert, update, delete on public.dataset_files to authenticated;
grant select, insert, update, delete on public.charts to authenticated;
grant select, insert, update, delete on public.kpis to authenticated;

-- Row Level Security: per-command policies scoped to authenticated users.
alter table public.datasets enable row level security;
alter table public.dataset_files enable row level security;
alter table public.charts enable row level security;
alter table public.kpis enable row level security;

-- Replace legacy hand-written FOR ALL policies.
drop policy if exists "users can only access their own datasets" on public.datasets;
drop policy if exists "users can only access files for their datasets" on public.dataset_files;
drop policy if exists "users can only access their own charts" on public.charts;
drop policy if exists "users can only access their own kpis" on public.kpis;

drop policy if exists "datasets_select_own" on public.datasets;
create policy "datasets_select_own" on public.datasets
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "datasets_insert_own" on public.datasets;
create policy "datasets_insert_own" on public.datasets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "datasets_update_own" on public.datasets;
create policy "datasets_update_own" on public.datasets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "datasets_delete_own" on public.datasets;
create policy "datasets_delete_own" on public.datasets
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- dataset_files inherit ownership through their dataset.
drop policy if exists "dataset_files_select_own" on public.dataset_files;
create policy "dataset_files_select_own" on public.dataset_files
  for select to authenticated
  using (exists (
    select 1 from public.datasets d
    where d.id = dataset_files.dataset_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "dataset_files_insert_own" on public.dataset_files;
create policy "dataset_files_insert_own" on public.dataset_files
  for insert to authenticated
  with check (exists (
    select 1 from public.datasets d
    where d.id = dataset_files.dataset_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "dataset_files_update_own" on public.dataset_files;
create policy "dataset_files_update_own" on public.dataset_files
  for update to authenticated
  using (exists (
    select 1 from public.datasets d
    where d.id = dataset_files.dataset_id and d.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.datasets d
    where d.id = dataset_files.dataset_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "dataset_files_delete_own" on public.dataset_files;
create policy "dataset_files_delete_own" on public.dataset_files
  for delete to authenticated
  using (exists (
    select 1 from public.datasets d
    where d.id = dataset_files.dataset_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "charts_select_own" on public.charts;
create policy "charts_select_own" on public.charts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "charts_insert_own" on public.charts;
create policy "charts_insert_own" on public.charts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "charts_update_own" on public.charts;
create policy "charts_update_own" on public.charts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "charts_delete_own" on public.charts;
create policy "charts_delete_own" on public.charts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "kpis_select_own" on public.kpis;
create policy "kpis_select_own" on public.kpis
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "kpis_insert_own" on public.kpis;
create policy "kpis_insert_own" on public.kpis
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "kpis_update_own" on public.kpis;
create policy "kpis_update_own" on public.kpis
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "kpis_delete_own" on public.kpis;
create policy "kpis_delete_own" on public.kpis
  for delete to authenticated
  using ((select auth.uid()) = user_id);
