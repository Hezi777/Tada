import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/dashboards/[id]/datasets — attach a dataset to a dashboard */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dashboardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify dashboard ownership
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id")
    .eq("id", dashboardId)
    .eq("user_id", user.id)
    .single();

  if (!dashboard) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const raw = await request.json();
  const datasetId = raw?.datasetId;
  if (!datasetId) {
    return NextResponse.json({ error: "dataset_id_required" }, { status: 400 });
  }

  const { error } = await supabase.from("dashboard_datasets").insert({
    dashboard_id: dashboardId,
    dataset_id: datasetId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "attach_failed" },
      { status: 400 },
    );
  }

  // Touch dashboard updated_at
  await supabase
    .from("dashboards")
    .update({ name: dashboard.id ? undefined : undefined })
    .eq("id", dashboardId);

  return NextResponse.json({ ok: true });
}

/** DELETE /api/dashboards/[id]/datasets — detach a dataset from a dashboard */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dashboardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const datasetId = raw?.datasetId;
  if (!datasetId) {
    return NextResponse.json({ error: "dataset_id_required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("dashboard_datasets")
    .delete()
    .eq("dashboard_id", dashboardId)
    .eq("dataset_id", datasetId);

  if (error) {
    return NextResponse.json(
      { error: error.message || "detach_failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
