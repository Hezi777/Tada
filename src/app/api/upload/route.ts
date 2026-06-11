import { createHash } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import {
  profileUpload,
  serializeRows,
  type UploadedFile,
} from "@/features/dashboard/server/upload";
import { UploadValidationError } from "@/features/dashboard/server/parse";
import type { UploadProfileResponse } from "@/shared/contracts";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf",
};

async function readUploadedFile(
  value: FormDataEntryValue | null,
): Promise<UploadedFile | null> {
  if (!(value instanceof File)) {
    return null;
  }
  const buffer = Buffer.from(await value.arrayBuffer());
  return { buffer, originalname: value.name };
}

/**
 * Phase 1 of the upload flow: parse, profile (pure TS), suggest a topic and
 * persist the dataset. Chart generation happens in /api/generate after the
 * user confirms topic + chart count.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = await readUploadedFile(formData.get("file"));
    if (!file) {
      return NextResponse.json({ error: "file_missing" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { rows, columns, profile, suggestedTopic } =
      await profileUpload(file);
    const serializedRows = serializeRows(rows);
    const contentHash = createHash("sha256").update(file.buffer).digest("hex");

    // Keep the raw file in storage (private bucket, per-user folder). Failure
    // here is non-fatal: the parsed rows are already the source of truth.
    const extension = path.extname(file.originalname).toLowerCase();
    const storagePath = `${user.id}/${Date.now()}-${file.originalname.replace(/[^\w.\-֐-׿]/g, "_")}`;
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, file.buffer, {
        contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
      });
    if (storageError) {
      console.warn("[upload] storage upload failed:", storageError.message);
    }

    const { data: datasetRecord, error: datasetError } = await supabase
      .from("datasets")
      .insert({
        user_id: user.id,
        name: file.originalname,
        rows: serializedRows,
        row_count: serializedRows.length,
        topic: suggestedTopic,
        profile,
        content_hash: contentHash,
        storage_path: storageError ? null : storagePath,
      })
      .select("id")
      .single();

    if (datasetError || !datasetRecord) {
      throw new Error(datasetError?.message || "dataset_persist_failed");
    }
    const datasetId = String(datasetRecord.id);

    const { error: fileError } = await supabase.from("dataset_files").insert({
      dataset_id: datasetId,
      file_name: file.originalname,
      is_primary: true,
      row_count: serializedRows.length,
    });
    if (fileError) {
      throw new Error(fileError.message);
    }

    const dashboardId = formData.get("dashboardId");
    if (dashboardId && typeof dashboardId === "string") {
      await supabase
        .from("dashboard_datasets")
        .insert({ dashboard_id: dashboardId, dataset_id: datasetId });
      await supabase
        .from("dashboards")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", dashboardId);
    }

    const response: UploadProfileResponse = {
      datasetId,
      fileName: file.originalname,
      rowCount: serializedRows.length,
      columns,
      profile,
      suggestedTopic,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
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
