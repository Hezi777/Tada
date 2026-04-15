import type { HealthResponse } from "@/shared/contracts";

export function getHealthPayload(): HealthResponse {
  return { ok: true };
}
