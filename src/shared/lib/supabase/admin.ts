import { createClient } from "@supabase/supabase-js";
import { env, getSupabaseServiceRoleKey } from "@/shared/lib/env";

export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseServiceRoleKey(),
  );
}
