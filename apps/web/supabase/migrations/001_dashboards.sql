-- Multi-Dashboard Support Migration
-- Run this in your Supabase SQL Editor

-- dashboards table
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled dashboard',
  icon text not null default 'bar-chart',
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboards enable row level security;

create policy "Users manage own dashboards"
  on public.dashboards for all using (auth.uid() = user_id);

-- junction: dashboard <-> dataset
create table public.dashboard_datasets (
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  primary key (dashboard_id, dataset_id)
);

alter table public.dashboard_datasets enable row level security;

create policy "Users manage own dashboard_datasets"
  on public.dashboard_datasets for all using (
    exists (
      select 1 from public.dashboards
      where dashboards.id = dashboard_datasets.dashboard_id
        and dashboards.user_id = auth.uid()
    )
  );

-- auto-update updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dashboards_updated_at
  before update on public.dashboards
  for each row execute function public.update_updated_at();
