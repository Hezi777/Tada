import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import {
  buildDashboardSnapshot,
  generateDashboardArtifacts,
} from "@/features/dashboard/server/upload";
import { inferColumns } from "@/features/dashboard/server/infer";
import { upsertDatasetChunks } from "@/features/rag/server/user-data";
import {
  DatasetProfileSchema,
  GenerateDashboardRequestSchema,
  type DashboardColumn,
} from "@/shared/contracts";

export const runtime = "nodejs";

/**
 * Phase 2 of the upload flow: the user confirmed a topic and chart count, so
 * generate the BI-rules-grounded dashboard, persist it, and index the dataset
 * into the per-user data RAG for chat.
 */
export async function POST(request: Request) {
  try {
    const body = GenerateDashboardRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { datasetId, topic, chartCount } = body.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("id, name, rows, topic, profile, content_hash")
      .eq("id", datasetId)
      .single();
    if (datasetError || !dataset) {
      return NextResponse.json({ error: "dataset_not_found" }, { status: 404 });
    }

    const rows = Array.isArray(dataset.rows)
      ? (dataset.rows as Record<string, unknown>[])
      : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "empty_dataset" }, { status: 400 });
    }

    const parsedProfile = DatasetProfileSchema.safeParse(dataset.profile);
    const columns: DashboardColumn[] = parsedProfile.success
      ? parsedProfile.data.columns.map((column) => ({
          name: column.name,
          kind: column.kind,
        }))
      : inferColumns(rows);

    if (topic !== dataset.topic) {
      await supabase.from("datasets").update({ topic }).eq("id", datasetId);
    }

    const { charts, kpis } = await generateDashboardArtifacts(rows, columns, {
      topic,
      chartCount,
    });

    const [chartsResult, kpisResult] = await Promise.all([
      supabase
        .from("charts")
        .upsert(
          { dataset_id: datasetId, user_id: user.id, configs: charts },
          { onConflict: "dataset_id" },
        ),
      supabase
        .from("kpis")
        .upsert(
          { dataset_id: datasetId, user_id: user.id, configs: kpis },
          { onConflict: "dataset_id" },
        ),
    ]);
    if (chartsResult.error || kpisResult.error) {
      throw new Error(
        chartsResult.error?.message ||
          kpisResult.error?.message ||
          "dashboard_persist_failed",
      );
    }

    // Index the dataset for grounded chat. Non-fatal: chat falls back to
    // profile context when chunks are missing.
    if (parsedProfile.success) {
      try {
        const result = await upsertDatasetChunks(supabase, {
          userId: user.id,
          datasetId,
          contentHash: String(dataset.content_hash ?? ""),
          profile: parsedProfile.data,
          rows,
        });
        if (!result.skipped) {
          console.log(
            `[generate] embedded ${result.chunkCount} chunks for dataset ${datasetId}`,
          );
        }
      } catch (error) {
        console.error("[generate] chunk indexing failed:", error);
      }
    }

    const { data: fileRecords } = await supabase
      .from("dataset_files")
      .select("id, file_name, row_count")
      .eq("dataset_id", datasetId)
      .order("uploaded_at", { ascending: true });

    const snapshot = buildDashboardSnapshot({
      datasetId,
      fileName: String(dataset.name ?? "dataset"),
      rows,
      columns,
      charts,
      kpis,
      files: (fileRecords ?? []).map((record) => ({
        id: String(record.id),
        fileName: String(record.file_name),
        rowCount: Number(record.row_count ?? rows.length),
      })),
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[generate] failed:", error.message);
      return NextResponse.json(
        { error: error.message || "generate_failed" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "generate_failed" }, { status: 400 });
  }
}
