import { DeleteChainedFileRequestSchema } from "@tada/shared";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  handleChainRemove,
  handleChainUpload,
  type UploadedFile,
} from "@/server/upload";

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

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = await readUploadedFile(formData.get("file"));
  if (!file) {
    return NextResponse.json({ error: "file_missing" }, { status: 400 });
  }

  const datasetId = formData.get("datasetId");
  if (typeof datasetId !== "string" || !datasetId) {
    return NextResponse.json({ error: "dataset_id_missing" }, { status: 400 });
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

    const state = await handleChainUpload(datasetId, file);
    const addedFile = [...state.files]
      .reverse()
      .find(
        (entry) => entry.fileName === file.originalname && !entry.isPrimary,
      );

    const { error: insertError } = await supabaseAdmin
      .from("dataset_files")
      .insert({
        dataset_id: datasetId,
        file_name: file.originalname,
        is_primary: false,
        row_count: addedFile?.rowCount ?? 0,
      });

    if (insertError) {
      throw new Error(insertError.message || "upload_chain_persist_failed");
    }

    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[upload-chain] failed:", error.message);
      return NextResponse.json(
        { error: error.message || "upload_chain_failed" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "upload_chain_failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const parsed = DeleteChainedFileRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const state = handleChainRemove(parsed.data.datasetId, parsed.data.fileId);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[upload-chain-delete] failed:", error.message);
      return NextResponse.json(
        { error: error.message || "upload_chain_remove_failed" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "upload_chain_remove_failed" },
      { status: 400 },
    );
  }
}
