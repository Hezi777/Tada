-- Widget size classes (docs/WIDGET_SIZING.md): size vocabulary moves from
-- per-type spans to uniform classes (small 1×1, medium 2×1, large 2×2,
-- xlarge 4×2). Remap persisted chart configs so each keeps the geometry it
-- had under the old vocabulary:
--   bar/area/scatter: small(2×1)→medium, medium(2×2)→large, large(4×2)→xlarge
--   donut:            medium(2×2)→large, large(2×3)→large (nearest class)
--   kpi configs are untouched (their small/medium/large geometry is unchanged).
-- One-time remap; safe to re-run only before any post-migration edits, so it
-- is intentionally a single migration rather than idempotent logic.

update public.charts
set configs = (
  select coalesce(
    jsonb_agg(
      case
        when c ->> 'type' in ('bar', 'area', 'scatter') then
          jsonb_set(
            c,
            '{size}',
            to_jsonb(
              case c ->> 'size'
                when 'small' then 'medium'
                when 'medium' then 'large'
                when 'large' then 'xlarge'
                else 'large'
              end
            )
          )
        when c ->> 'type' = 'donut' then jsonb_set(c, '{size}', '"large"')
        else c
      end
      order by ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(configs) with ordinality as t(c, ordinality)
)
where configs <> '[]'::jsonb;
