import type { HealthResponse } from "@tada/shared";

export function getHealthPayload(): HealthResponse {
  return { ok: true };
}
