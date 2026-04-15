import { NextResponse } from "next/server";
import { getHealthPayload } from "@/shared/lib/health";

export async function GET() {
  return NextResponse.json(getHealthPayload());
}
