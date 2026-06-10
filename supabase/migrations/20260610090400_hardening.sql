-- Security hardening from supabase advisor findings.
--
-- 1. The app never queries data tables before sign-in, so the anon role
--    needs no privileges on them (rows were already protected by RLS; this
--    also hides the tables from the anon GraphQL schema).
-- 2. Public buckets serve objects through their public URL without a SELECT
--    policy; the broad policy only enabled bucket listing, so drop it.
-- 3. rls_auto_enable() is an internal event-trigger helper and should not be
--    executable through the Data API.

revoke all on public.datasets from anon;
revoke all on public.dataset_files from anon;
revoke all on public.charts from anon;
revoke all on public.kpis from anon;
revoke all on public.dashboards from anon;
revoke all on public.dashboard_datasets from anon;
revoke all on public.bi_rules_chunks from anon;
revoke all on public.user_data_chunks from anon;

revoke execute on function public.match_bi_rules(extensions.vector, integer, text) from anon;
revoke execute on function public.match_user_data_chunks(extensions.vector, uuid, integer) from anon;

drop policy if exists "avatars_select_public" on storage.objects;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
