import { ChatDashboardRequestSchema } from "@/shared/contracts";
import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { handleChat } from "@/features/dashboard/server/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = ChatDashboardRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const response = await handleChat({ supabase, ...parsed.data });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "not_found" || error.message === "missing_rows") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("[chat] failed:", error.message);
    }
    return NextResponse.json({ error: "chat_failed" }, { status: 400 });
  }
}
