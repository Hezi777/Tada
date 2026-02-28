import { type HealthResponse } from "@tada/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const payload: HealthResponse = { ok: true };
  return NextResponse.json(payload);
}
