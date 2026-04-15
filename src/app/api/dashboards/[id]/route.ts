import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { inferColumns } from "@/features/dashboard/server/infer";
import { normalizeChartConfig } from "@/shared/contracts";
import {
  createDatasetState,
  setDatasetFiles,
  setDatasetRows,
} from "@/features/dashboard/server/state";
import { UpdateDashboardRequestSchema } from "@/shared/contracts";
import type { SerializedRow } from "@/shared/contracts";

export const runtime = "nodejs";

function buildDatasetMeta(
  rows: SerializedRow[],
  columns: ReturnType<typeof inferColumns>,
) {
  return {
    columns,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 5),
  };
}

/** GET /api/dashboards/[id] — load a dashboard with its full dataset state */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dashboardId } = await params;
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify dashboard ownership
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from("dashboards")
    .select("id, name, icon, color, user_id")
    .eq("id", dashboardId)
    .single();

  if (dashError || !dashboard || dashboard.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Get attached datasets
  const { data: junctions } = await supabaseAdmin
    .from("dashboard_datasets")
    .select("dataset_id")
    .eq("dashboard_id", dashboardId);

  if (!junctions || junctions.length === 0) {
    return NextResponse.json({
      empty: true,
      dashboard: {
        id: String(dashboard.id),
        name: String(dashboard.name),
        icon: String(dashboard.icon),
        color: String(dashboard.color),
      },
    });
  }

  // Load the most recent dataset (primary) from the attached ones
  const datasetIds = junctions.map((j) => j.dataset_id);
  const { data: dataset, error: datasetError } = await supabaseAdmin
    .from("datasets")
    .select("id, name, rows, created_at")
    .in("id", datasetIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (datasetError || !dataset) {
    return NextResponse.json({
      empty: true,
      dashboard: {
        id: String(dashboard.id),
        name: String(dashboard.name),
        icon: String(dashboard.icon),
        color: String(dashboard.color),
      },
    });
  }

  const datasetId = String(dataset.id);
  const rows = Array.isArray(dataset.rows)
    ? (dataset.rows as SerializedRow[])
    : [];
  const columns = inferColumns(rows);
  const datasetMeta = buildDatasetMeta(rows, columns);

  const [{ data: chartRow }, { data: kpiRow }, { data: fileRows }] =
    await Promise.all([
      supabaseAdmin
        .from("charts")
        .select("configs")
        .eq("dataset_id", datasetId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("kpis")
        .select("configs")
        .eq("dataset_id", datasetId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("dataset_files")
        .select("id, file_name, is_primary")
        .eq("dataset_id", datasetId)
        .order("is_primary", { ascending: false }),
    ]);

  const charts = Array.isArray(chartRow?.configs)
    ? chartRow.configs.map((chart) => normalizeChartConfig(chart))
    : [];
  const kpis = Array.isArray(kpiRow?.configs) ? kpiRow.configs : [];
  const files = (fileRows ?? []).map((file) => ({
    id: String(file.id),
    fileName: String(file.file_name),
    rowCount: file.is_primary ? rows.length : 0,
    isPrimary: Boolean(file.is_primary),
  }));

  createDatasetState(datasetId, columns, kpis, charts, datasetMeta);
  setDatasetRows(datasetId, rows);
  setDatasetFiles(datasetId, [
    {
      id: files.find((file) => file.isPrimary)?.id ?? crypto.randomUUID(),
      fileName: String(dataset.name ?? "dataset"),
      rows,
    },
  ]);

  return NextResponse.json({
    dashboard: {
      id: String(dashboard.id),
      name: String(dashboard.name),
      icon: String(dashboard.icon),
      color: String(dashboard.color),
    },
    datasetId,
    version: 1,
    fileName: String(dataset.name ?? "dataset"),
    columns,
    datasetMeta,
    charts,
    kpis,
    rows,
    files:
      files.length > 0
        ? files
        : [
            {
              id: crypto.randomUUID(),
              fileName: String(dataset.name ?? "dataset"),
              rowCount: rows.length,
              isPrimary: true,
            },
          ],
  });
}

/** PATCH /api/dashboards/[id] — update dashboard metadata */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dashboardId } = await params;
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = UpdateDashboardRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("dashboards")
    .update(parsed.data)
    .eq("id", dashboardId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "dashboard_update_failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/dashboards/[id] — delete a dashboard */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dashboardId } = await params;
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("dashboards")
    .delete()
    .eq("id", dashboardId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "dashboard_delete_failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
