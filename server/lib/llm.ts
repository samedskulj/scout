import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { z } from "zod";

const DEFAULT_MODEL = "claude-opus-5-5";
/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);
// Serverless hosts (Vercel) only allow writes under the temp folder; there the cache lives per instance.
const CACHE_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "llm-cache") : path.resolve(".llm-cache");

export type Effort = "low" | "medium" | "high";

export class LlmError extends Error {
  override name = "LlmError";
}

export const model = (): string => process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;

/** Live mode = we have credentials for the Claude API. Otherwise apps run their offline fallbacks. */
export const isLive = (): boolean =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | undefined;
export const getClient = (): Anthropic => (client ??= new Anthropic());

/** Server-side refusal fallback, for the models that accept it. Spread into a beta request. */
export const fallbackParams = () =>
  FALLBACK_MODELS.has(model()) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  effort?: Effort;
}

/**
 * One Claude call that must return data matching `schema`.
 * Structured outputs guarantee the JSON shape; Zod re-validates it on the way in.
 * Responses are cached on disk by request hash so demos and evals replay deterministically.
 */
export async function generateStructured<T>({
  schema,
  system,
  prompt,
  effort = "medium",
}: StructuredRequest<T>): Promise<T> {
  const format = betaZodOutputFormat(schema);
  const key = hash({ model: model(), system, prompt, effort, format });

  const cached = await readCache(key, schema);
  if (cached !== undefined) return cached;

  const response = await getClient().beta.messages.parse({
    model: model(),
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort, format },
    ...fallbackParams(),
  });

  if (response.stop_reason === "refusal") throw new LlmError("Claude declined this request.");
  if (response.stop_reason === "max_tokens") throw new LlmError("Claude's response was cut off.");
  if (!response.parsed_output) throw new LlmError("Claude's response did not match the expected schema.");

  await writeCache(key, response.parsed_output);
  return response.parsed_output;
}

const cacheEnabled = (): boolean => process.env.LLM_CACHE !== "off";

export function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}

export async function readCache<T>(key: string, schema: z.ZodType<T>): Promise<T | undefined> {
  if (!cacheEnabled()) return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  if (!cacheEnabled()) return;
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch (err) {
    // A cache that can't be written must never fail the request.
    console.warn(`LLM cache not written: ${(err as Error).message}`);
  }
}
