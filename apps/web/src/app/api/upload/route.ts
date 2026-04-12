import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createDatasetState,
  setDatasetFiles,
  setDatasetRows,
} from "@/server/state";
import { handleUpload, type UploadedFile } from "@/server/upload";

export const runtime = "nodejs";

async function readUploadedFile(
  value: FormDataEntryValue | null,
): Promise<UploadedFile | null> {
  if (!(value instanceof File)) {
    return null;
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  return {
    buffer,
    originalname: value.name,
  };
}

function buildStoredRows(
  rows: Array<Record<string, string | number | boolean | null>>,
): Array<Record<string, string | number | boolean | null>> {
  return rows.map((row) => ({ ...row }));
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = await readUploadedFile(formData.get("file"));
  if (!file) {
    return NextResponse.json({ error: "file_missing" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const state = await handleUpload(file);
    const { data: datasetRecord, error: datasetError } = await supabaseAdmin
      .from("datasets")
      .insert({
        user_id: user.id,
        name: file.originalname,
        rows: state.rows,
      })
      .select("id")
      .single();

    if (datasetError || !datasetRecord) {
      throw new Error(datasetError?.message || "dataset_persist_failed");
    }

    const datasetId = String(datasetRecord.id);
    const persistedRows = buildStoredRows(state.rows);

    createDatasetState(
      datasetId,
      state.columns,
      state.kpis,
      state.charts,
      state.datasetMeta,
    );
    setDatasetRows(datasetId, persistedRows);
    setDatasetFiles(datasetId, [
      {
        id: crypto.randomUUID(),
        fileName: file.originalname,
        rows: persistedRows,
      },
    ]);

    const [{ error: fileError }, { error: chartsError }, { error: kpisError }] =
      await Promise.all([
        supabaseAdmin.from("dataset_files").insert({
          dataset_id: datasetId,
          file_name: file.originalname,
          is_primary: true,
          row_count: state.rows.length,
        }),
        supabaseAdmin.from("charts").insert({
          dataset_id: datasetId,
          user_id: user.id,
          configs: state.charts,
        }),
        supabaseAdmin.from("kpis").insert({
          dataset_id: datasetId,
          user_id: user.id,
          configs: state.kpis,
        }),
      ]);

    if (fileError || chartsError || kpisError) {
      throw new Error(
        fileError?.message ||
          chartsError?.message ||
          kpisError?.message ||
          "dataset_persist_failed",
      );
    }

    // If a dashboardId was provided, attach this dataset to that dashboard
    const dashboardId = formData.get("dashboardId");
    if (dashboardId && typeof dashboardId === "string") {
      await supabaseAdmin.from("dashboard_datasets").insert({
        dashboard_id: dashboardId,
        dataset_id: datasetId,
      });
      // Touch the dashboard's updated_at
      await supabaseAdmin
        .from("dashboards")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", dashboardId);
    }

    return NextResponse.json({
      ...state,
      datasetId,
      fileName: file.originalname,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[upload] failed:", error.message);
      return NextResponse.json(
        { error: error.message || "upload_failed" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 400 });
  }
}
