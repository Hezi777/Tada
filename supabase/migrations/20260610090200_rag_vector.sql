-- RAG infrastructure: pgvector + the two retrieval indexes.
--
-- bi_rules_chunks  - global BI/data-viz best-practice rules, queried at
--                    dashboard-generation time. Seeded by scripts/seed-bi-rules.ts.
-- user_data_chunks - per-user, per-dataset summaries of uploaded data,
--                    queried at chat time.
--
-- Embeddings are 384-dim (Xenova/multilingual-e5-small), cosine distance.

create extension if not exists vector with schema extensions;

create table if not exists public.bi_rules_chunks (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  category text not null,
  content text not null,
  action_if_fail text not null,
  severity text not null check (severity in ('error', 'warning', 'info')),
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bi_rules_chunks_embedding
  on public.bi_rules_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists idx_bi_rules_chunks_category
  on public.bi_rules_chunks (category);

create table if not exists public.user_data_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  chunk_index integer not null,
  chunk_type text not null default 'summary',
  content text not null,
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, chunk_index)
);

create index if not exists idx_user_data_chunks_embedding
  on public.user_data_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists idx_user_data_chunks_dataset_id
  on public.user_data_chunks (dataset_id);

-- RLS: rules are read-only reference data for signed-in users (writes happen
-- through the service-role seed script, which bypasses RLS). Data chunks are
-- strictly user-scoped.
alter table public.bi_rules_chunks enable row level security;
alter table public.user_data_chunks enable row level security;

drop policy if exists "bi_rules_select_authenticated" on public.bi_rules_chunks;
create policy "bi_rules_select_authenticated" on public.bi_rules_chunks
  for select to authenticated
  using (true);

drop policy if exists "user_data_chunks_select_own" on public.user_data_chunks;
create policy "user_data_chunks_select_own" on public.user_data_chunks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_data_chunks_insert_own" on public.user_data_chunks;
create policy "user_data_chunks_insert_own" on public.user_data_chunks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_data_chunks_delete_own" on public.user_data_chunks;
create policy "user_data_chunks_delete_own" on public.user_data_chunks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Vector search RPCs. SECURITY INVOKER so RLS keeps applying to the caller.
create or replace function public.match_bi_rules(
  query_embedding extensions.vector(384),
  match_count integer default 8,
  filter_category text default null
)
returns table (
  rule_id text,
  category text,
  content text,
  action_if_fail text,
  severity text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    b.rule_id,
    b.category,
    b.content,
    b.action_if_fail,
    b.severity,
    1 - (b.embedding <=> query_embedding) as similarity
  from public.bi_rules_chunks b
  where filter_category is null or b.category = filter_category
  order by b.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.match_user_data_chunks(
  query_embedding extensions.vector(384),
  p_dataset_id uuid,
  match_count integer default 6
)
returns table (
  chunk_index integer,
  chunk_type text,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.chunk_index,
    c.chunk_type,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.user_data_chunks c
  where c.dataset_id = p_dataset_id
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
