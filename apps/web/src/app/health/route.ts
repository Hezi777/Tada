import { NextResponse } from "next/server";
import { getHealthPayload } from "@/server/health";

export async function GET() {
  return NextResponse.json(getHealthPayload());
}
