import Groq from "groq-sdk";
import type { z } from "zod";
import { getGroqApiKey } from "@/shared/lib/env";

// One place for resilient Groq calls: JSON-mode + zod validation + retry.
// Routes must never crash because the model returned something odd, so every
// helper resolves to null on failure instead of throwing.

let client: Groq | null = null;

export function getGroqClient(): Groq | null {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return null;
  }
  if (!client) {
    client = new Groq({ apiKey, timeout: 45_000, maxRetries: 2 });
  }
  return client;
}

export type JsonCompletionOptions = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

/**
 * Ask the model for a JSON object and validate it against `schema`.
 * Retries once with an explicit correction prompt when the first response
 * fails to parse or validate. Returns null when the model is unavailable,
 * rate-limited beyond SDK retries, or keeps producing invalid output.
 */
export async function jsonCompletion<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: JsonCompletionOptions,
): Promise<T | null> {
  const groq = getGroqClient();
  if (!groq) {
    return null;
  }

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let text: string | null = null;
    try {
      const completion = await groq.chat.completions.create({
        model: options.model,
        temperature: options.temperature ?? 0.2,
        max_completion_tokens: options.maxTokens ?? 1024,
        response_format: { type: "json_object" },
        messages,
      });
      text = completion.choices[0]?.message?.content ?? null;
    } catch (error) {
      if (error instanceof Groq.APIError) {
        console.error(
          `[groq] request failed (status ${error.status ?? "unknown"}): ${error.message}`,
        );
      } else {
        console.error("[groq] request failed:", error);
      }
      return null;
    }

    if (text) {
      const jsonText = extractJsonObject(text) ?? text;
      try {
        const parsed = schema.safeParse(JSON.parse(jsonText));
        if (parsed.success) {
          return parsed.data;
        }
        console.warn(
          `[groq] response failed validation (attempt ${attempt + 1}):`,
          parsed.error.issues.slice(0, 3),
        );
      } catch {
        console.warn(`[groq] response was not JSON (attempt ${attempt + 1})`);
      }
    }

    messages.push(
      { role: "assistant", content: text ?? "" },
      {
        role: "user",
        content:
          "That response was not valid JSON matching the required schema. Respond again with ONLY the corrected JSON object.",
      },
    );
  }

  return null;
}

/** Plain-text completion with the same failure-isolation guarantees. */
export async function textCompletion(
  prompt: string,
  options: JsonCompletionOptions,
): Promise<string | null> {
  const groq = getGroqClient();
  if (!groq) {
    return null;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0.3,
      max_completion_tokens: options.maxTokens ?? 600,
      messages: [
        ...(options.systemPrompt
          ? ([{ role: "system", content: options.systemPrompt }] as const)
          : []),
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? null;
  } catch (error) {
    if (error instanceof Groq.APIError) {
      console.error(
        `[groq] request failed (status ${error.status ?? "unknown"}): ${error.message}`,
      );
    } else {
      console.error("[groq] request failed:", error);
    }
    return null;
  }
}
