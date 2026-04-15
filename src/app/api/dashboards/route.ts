import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import { CreateDashboardRequestSchema } from "@/shared/contracts";

export const runtime = "nodejs";

/** GET /api/dashboards — list all dashboards for the current user */
export async function GET() {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: dashboards, error } = await supabaseAdmin
    .from("dashboards")
    .select("id, name, icon, color, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "dashboards_list_failed" },
      { status: 400 },
    );
  }

  // Get file counts per dashboard via junction table
  const dashboardIds = (dashboards ?? []).map((d) => d.id);
  const fileCounts: Record<string, number> = {};

  if (dashboardIds.length > 0) {
    const { data: junctions } = await supabaseAdmin
      .from("dashboard_datasets")
      .select("dashboard_id")
      .in("dashboard_id", dashboardIds);

    if (junctions) {
      for (const row of junctions) {
        fileCounts[row.dashboard_id] = (fileCounts[row.dashboard_id] ?? 0) + 1;
      }
    }
  }

  const items = (dashboards ?? []).map((d) => ({
    id: String(d.id),
    name: String(d.name),
    icon: String(d.icon),
    color: String(d.color),
    fileCount: fileCounts[d.id] ?? 0,
    createdAt: String(d.created_at),
    updatedAt: String(d.updated_at),
  }));

  return NextResponse.json(items);
}

/** POST /api/dashboards — create a new dashboard */
export async function POST(request: Request) {
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
  const parsed = CreateDashboardRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { name, icon, color, datasetIds } = parsed.data;

  const { data: dashboard, error } = await supabaseAdmin
    .from("dashboards")
    .insert({ user_id: user.id, name, icon, color })
    .select("id, name, icon, color, created_at, updated_at")
    .single();

  if (error || !dashboard) {
    return NextResponse.json(
      { error: error?.message || "dashboard_create_failed" },
      { status: 400 },
    );
  }

  // Attach datasets if provided
  if (datasetIds && datasetIds.length > 0) {
    const junctionRows = datasetIds.map((datasetId) => ({
      dashboard_id: dashboard.id,
      dataset_id: datasetId,
    }));
    await supabaseAdmin.from("dashboard_datasets").insert(junctionRows);
  }

  return NextResponse.json({
    id: String(dashboard.id),
    name: String(dashboard.name),
    icon: String(dashboard.icon),
    color: String(dashboard.color),
    fileCount: datasetIds?.length ?? 0,
    createdAt: String(dashboard.created_at),
    updatedAt: String(dashboard.updated_at),
  });
}
