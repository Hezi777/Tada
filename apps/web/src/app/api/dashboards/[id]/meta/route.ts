import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** GET /api/dashboards/[id]/meta — lightweight endpoint for drill-in fetching (skips row JSON payload) */
export async function GET(
    _request: Request,
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

    // Load the most recent dataset (primary) from the attached ones, excluding `rows`
    const datasetIds = junctions.map((j) => j.dataset_id);
    const { data: dataset, error: datasetError } = await supabaseAdmin
        .from("datasets")
        .select("id, name, created_at, row_count")
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

    const [{ data: fileRows }] = await Promise.all([
        supabaseAdmin
            .from("dataset_files")
            .select("id, file_name, is_primary")
            .eq("dataset_id", datasetId)
            .order("is_primary", { ascending: false }),
    ]);

    const files = (fileRows ?? []).map((file) => ({
        id: String(file.id),
        fileName: String(file.file_name),
        rowCount: file.is_primary ? (dataset.row_count ?? 0) : 0,
        isPrimary: Boolean(file.is_primary),
    }));

    return NextResponse.json({
        dashboard: {
            id: String(dashboard.id),
            name: String(dashboard.name),
            icon: String(dashboard.icon),
            color: String(dashboard.color),
        },
        datasetId,
        files:
            files.length > 0
                ? files
                : [
                    {
                        id: crypto.randomUUID(),
                        fileName: String(dataset.name ?? "dataset"),
                        rowCount: dataset.row_count ?? 0,
                        isPrimary: true,
                    },
                ],
    });
}
