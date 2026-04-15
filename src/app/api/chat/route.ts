import { ChatDashboardRequestSchema } from "@/shared/contracts";
import { NextResponse } from "next/server";
import { handleChat } from "@/features/dashboard/server/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = ChatDashboardRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const data = ChatDashboardRequestSchema.parse(raw) as Parameters<
      typeof handleChat
    >[0];
    const response = await handleChat(data);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "not_found" || error.message === "missing_rows") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "chat_failed" }, { status: 400 });
  }
}
