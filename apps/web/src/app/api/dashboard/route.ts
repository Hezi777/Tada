import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inferColumns } from "@/server/infer";
import {
  createDatasetState,
  setDatasetFiles,
  setDatasetRows,
} from "@/server/state";
import type { SerializedRow } from "@tada/shared";

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

export async function GET(request: Request) {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: dataset, error: datasetError } = await supabaseAdmin
    .from("datasets")
    .select("id,name,rows,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (datasetError) {
    return NextResponse.json(
      { error: datasetError.message || "dashboard_load_failed" },
      { status: 400 },
    );
  }

  if (!dataset) {
    return NextResponse.json({ empty: true });
  }

  const datasetId = String(dataset.id);
  const rows = Array.isArray(dataset.rows)
    ? (dataset.rows as SerializedRow[])
    : [];
  const columns = inferColumns(rows);
  const datasetMeta = buildDatasetMeta(rows, columns);

  const [
    { data: chartRow, error: chartError },
    { data: kpiRow, error: kpiError },
    { data: fileRows, error: fileError },
  ] = await Promise.all([
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
      .select("id,file_name,is_primary")
      .eq("dataset_id", datasetId)
      .order("is_primary", { ascending: false }),
  ]);

  if (chartError || kpiError || fileError) {
    return NextResponse.json(
      {
        error:
          chartError?.message ||
          kpiError?.message ||
          fileError?.message ||
          "dashboard_load_failed",
      },
      { status: 400 },
    );
  }

  const charts = Array.isArray(chartRow?.configs) ? chartRow.configs : [];
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
