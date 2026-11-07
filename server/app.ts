import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  AssistantRequestSchema,
  EXAMPLE_BRIEFS,
  ProfileRequestSchema,
  ScoutRequestSchema,
  type AssistantResponse,
  type DemoResponse,
  type Meta,
  type PlayerProfile,
  type ReportResponse,
  type ScoutResponse,
} from "../shared/types.ts";
import { askAssistant } from "./ai/assistant.ts";
import { checkClaims, fetchProfile, scoutBrief, writeReport, type Job } from "./ai/live.ts";
import { createApi, explainClaudeError, isLive, LlmError, parseBody, requireUser } from "./lib/index.ts";

/** Every route runs on the AI; without a key they answer 503 with the fix. */
function requireAi(): void {
  if (!isLive()) throw new HTTPException(503, { message: "The AI isn't configured: add ANTHROPIC_API_KEY to .env and restart the server." });
}

/**
 * The public landing demo searches the live web too, so anonymous visitors are capped per IP.
 * The built-in example briefs are cached for the day and cost nothing after the first run.
 */
const DEMO_LIMIT = 6;
const DEMO_WINDOW_MS = 60 * 60 * 1000;
const demoHits = new Map<string, number[]>();

function limitDemo(c: Context): void {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "local";
  const now = Date.now();
  const recent = (demoHits.get(ip) ?? []).filter((t) => now - t < DEMO_WINDOW_MS);
  if (recent.length >= DEMO_LIMIT) throw new HTTPException(429, { message: "That's plenty of demo briefs for now. Sign in to keep scouting." });
  recent.push(now);
  demoHits.set(ip, recent);
}

/**
 * Long AI jobs answer as newline-delimited JSON: progress lines while the web is searched, then the result
 * (or an error). Input is validated before the stream starts, so bad requests still get a plain 400.
 */
function streamJob<T>(c: Context, work: (job: Job) => Promise<T>): Response {
  const encoder = new TextEncoder();
  // If the browser goes away (tab closed, another player opened), stop the AI work too, so nobody pays for it.
  const abort = new AbortController();
  c.req.raw.signal.addEventListener("abort", () => abort.abort(), { once: true });
  let lastLine = "";
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      abort.abort();
    },
    async start(controller) {
      const send = (msg: unknown) => {
        if (!abort.signal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(msg)}\n`));
      };
      const progress = (line: string) => {
        if (line === lastLine) return;
        lastLine = line;
        send({ type: "progress", line });
      };
      try {
        send({ type: "result", data: await work({ progress, signal: abort.signal }) });
      } catch (err) {
        if (abort.signal.aborted) return;
        const error =
          err instanceof LlmError || err instanceof HTTPException
            ? err.message
            : err instanceof Anthropic.APIError
              ? explainClaudeError(err)
              : "Something went wrong on the server.";
        if (!(err instanceof LlmError)) console.error(err);
        send({ type: "error", error, code: "claude_unavailable" });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by a cancelled reader.
        }
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Reports work from a profile the client already holds; validated loosely, and checked against itself. */
const ReportRequestSchema = z.object({
  profile: z.custom<PlayerProfile>((v) => typeof v === "object" && v !== null && "name" in v && "season_stats" in v && "key_stats" in v),
  brief: z.string().max(500).nullable().optional(),
});

export const app = createApi()
  .use("*", requireUser)
  .get("/meta", (c) => c.json<Meta>({ examples: EXAMPLE_BRIEFS }))
  .post("/scout", async (c) => {
    const { query } = await parseBody(c, ScoutRequestSchema);
    requireAi();
    return streamJob<ScoutResponse>(c, (job) => scoutBrief(query, 8, job));
  })
  .post("/demo", async (c) => {
    const { query } = await parseBody(c, ScoutRequestSchema);
    requireAi();
    if (!EXAMPLE_BRIEFS.includes(query)) limitDemo(c);
    return streamJob<DemoResponse>(c, (job) => scoutBrief(query, 5, job));
  })
  .post("/profile", async (c) => {
    const { name, club } = await parseBody(c, ProfileRequestSchema);
    requireAi();
    return streamJob<PlayerProfile>(c, (job) => fetchProfile(name, club, job));
  })
  .post("/report", async (c) => {
    const { profile, brief } = await parseBody(c, ReportRequestSchema);
    requireAi();
    const report = await writeReport(profile, brief ?? undefined);
    return c.json<ReportResponse>({ report, checks: checkClaims(report, profile) });
  })
  .post("/assistant", async (c) => {
    const { messages, context } = await parseBody(c, AssistantRequestSchema);
    requireAi();
    return streamJob<AssistantResponse>(c, (job) => askAssistant(messages, context, job));
  });
