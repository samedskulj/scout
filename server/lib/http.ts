import Anthropic from "@anthropic-ai/sdk";
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ApiErrorBody, Health } from "../../shared/contract.ts";
import { isLive, LlmError, model } from "./llm.ts";

/** A Hono app mounted at /api with a health route and consistent JSON errors. */
export function createApi() {
  const app = new Hono().basePath("/api");

  app.get("/health", (c) => c.json<Health>({ live: isLive(), model: model() }));

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json<ApiErrorBody>({ error: err.message }, err.status);
    if (err instanceof LlmError) return c.json<ApiErrorBody>({ error: err.message, code: "claude_unavailable" }, 502);
    if (err instanceof Anthropic.APIError) {
      console.error(err.message);
      return c.json<ApiErrorBody>({ error: explainClaudeError(err), code: "claude_unavailable" }, 502);
    }
    console.error(err);
    return c.json<ApiErrorBody>({ error: "Something went wrong on the server." }, 500);
  });

  return app;
}

/** Turn API failures into a sentence a user can act on. */
export function explainClaudeError(err: InstanceType<typeof Anthropic.APIError>): string {
  const detail = (err.error as { error?: { message?: string } } | undefined)?.error?.message ?? err.message;
  if (/credit balance/i.test(detail)) return "The AI couldn't run: the API account has no credit left.";
  if (err.status === 401) return "The AI couldn't run: the API key was rejected.";
  if (err.status === 429) return "The AI is rate-limited right now. Try again in a minute.";
  if (err.status && err.status >= 500) return "The AI is temporarily unavailable. Try again shortly.";
  return `The AI couldn't run: ${detail}`;
}

/** Parse and validate a JSON request body, answering 400 with a readable message on failure. */
export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const json: unknown = await c.req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) throw new HTTPException(400, { message: z.prettifyError(result.error) });
  return result.data;
}

