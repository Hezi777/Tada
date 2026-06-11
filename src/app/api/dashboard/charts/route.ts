import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { ChartConfigSchema } from "@/shared/contracts";

export const runtime = "nodejs";

const PersistChartsRequestSchema = z.object({
  datasetId: z.string().min(1),
  charts: z.array(ChartConfigSchema),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = PersistChartsRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("charts")
    .update({ configs: parsed.data.charts })
    .eq("dataset_id", parsed.data.datasetId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "charts_persist_failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
