-- Multi-dashboard support: dashboards + dashboard<->dataset junction.

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled dashboard',
  icon text not null default 'bar-chart',
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_datasets (
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  primary key (dashboard_id, dataset_id)
);

create index if not exists idx_dashboards_user_id on public.dashboards (user_id);

drop trigger if exists dashboards_updated_at on public.dashboards;
create trigger dashboards_updated_at
  before update on public.dashboards
  for each row execute function public.update_updated_at();

grant select, insert, update, delete on public.dashboards to authenticated;
grant select, insert, delete on public.dashboard_datasets to authenticated;

alter table public.dashboards enable row level security;
alter table public.dashboard_datasets enable row level security;

drop policy if exists "Users manage own dashboards" on public.dashboards;
drop policy if exists "Users manage own dashboard_datasets" on public.dashboard_datasets;

drop policy if exists "dashboards_select_own" on public.dashboards;
create policy "dashboards_select_own" on public.dashboards
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "dashboards_insert_own" on public.dashboards;
create policy "dashboards_insert_own" on public.dashboards
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "dashboards_update_own" on public.dashboards;
create policy "dashboards_update_own" on public.dashboards
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "dashboards_delete_own" on public.dashboards;
create policy "dashboards_delete_own" on public.dashboards
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "dashboard_datasets_select_own" on public.dashboard_datasets;
create policy "dashboard_datasets_select_own" on public.dashboard_datasets
  for select to authenticated
  using (exists (
    select 1 from public.dashboards d
    where d.id = dashboard_datasets.dashboard_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "dashboard_datasets_insert_own" on public.dashboard_datasets;
create policy "dashboard_datasets_insert_own" on public.dashboard_datasets
  for insert to authenticated
  with check (exists (
    select 1 from public.dashboards d
    where d.id = dashboard_datasets.dashboard_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "dashboard_datasets_delete_own" on public.dashboard_datasets;
create policy "dashboard_datasets_delete_own" on public.dashboard_datasets
  for delete to authenticated
  using (exists (
    select 1 from public.dashboards d
    where d.id = dashboard_datasets.dashboard_id and d.user_id = (select auth.uid())
  ));
