-- The app stores one configs row per dataset in charts/kpis and upserts on
-- dataset_id; that contract needs a unique constraint to be enforceable.

-- Collapse any historical duplicates before adding the constraints.
delete from public.charts a using public.charts b
  where a.dataset_id = b.dataset_id and a.updated_at < b.updated_at;
delete from public.kpis a using public.kpis b
  where a.dataset_id = b.dataset_id and a.updated_at < b.updated_at;

create unique index if not exists idx_charts_dataset_id_unique
  on public.charts (dataset_id);
create unique index if not exists idx_kpis_dataset_id_unique
  on public.kpis (dataset_id);
