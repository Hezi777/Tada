import { z } from "zod";

const DEFAULT_GROQ_DASHBOARD_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GROQ_CHAT_MODEL = "moonshotai/kimi-k2-instruct-0905";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_DASHBOARD_MODEL: z.string().min(1).optional(),
  GROQ_CHAT_MODEL: z.string().min(1).optional(),
});

function readPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

function readServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_DASHBOARD_MODEL: process.env.GROQ_DASHBOARD_MODEL,
    GROQ_CHAT_MODEL: process.env.GROQ_CHAT_MODEL,
  });
}

function requireServerEnv(name: keyof z.infer<typeof serverEnvSchema>): string {
  const serverEnv = readServerEnv();
  const value = serverEnv[name];
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

const publicEnv = readPublicEnv();

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  GROQ_DASHBOARD_MODEL:
    readServerEnv().GROQ_DASHBOARD_MODEL ?? DEFAULT_GROQ_DASHBOARD_MODEL,
  GROQ_CHAT_MODEL: readServerEnv().GROQ_CHAT_MODEL ?? DEFAULT_GROQ_CHAT_MODEL,
};

export function getSupabaseServiceRoleKey(): string {
  return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getGroqApiKey(): string | null {
  return readServerEnv().GROQ_API_KEY ?? null;
}
