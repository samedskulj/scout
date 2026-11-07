import { HTTPException } from "hono/http-exception";
import {
  AssistantRequestSchema,
  EvalRequestSchema,
  type AssistantResponse,
  type DemoResponse,
  InterpretRequestSchema,
  ReportRequestSchema,
  SearchRequestSchema,
  type AiSource,
  type Interpretation,
  type Meta,
  type PlayerDetail,
  type PlayerProfile,
  type QueryEvalReport,
  type ReportResponse,
} from "../shared/types.ts";
import { askClaude, askOffline } from "./ai/assistant.ts";
import { claudeAi } from "./ai/claude.ts";
import { offlineAi, parseQuery } from "./ai/offline.ts";
import { checkClaims, type ScoutAi } from "./ai/types.ts";
import { createApi, isLive, parseBody, requireUser } from "./lib/index.ts";
import { getPlayer, PROFILES } from "./players.ts";
import { runQueryEval } from "./queryEval.ts";
import { search, similarPlayers } from "./search.ts";

/** The requested engine, defaulting to Claude when a key is configured. */
function engineFor(requested?: AiSource): ScoutAi {
  const choice = requested ?? (isLive() ? "claude" : "offline");
  if (choice === "claude" && !isLive()) {
    throw new HTTPException(400, { message: "Claude needs an ANTHROPIC_API_KEY in .env. The keyword engine works without one." });
  }
  return choice === "claude" ? claudeAi : offlineAi;
}

function requirePlayer(id: string): PlayerProfile {
  const player = getPlayer(id);
  if (!player) throw new HTTPException(404, { message: `No player with id ${id}.` });
  return player;
}

const star = [...PROFILES].filter((p) => p.position === "ST").sort((a, b) => b.market_value_m - a.market_value_m)[0];

export const app = createApi()
  .use("*", requireUser)
  .get("/meta", (c) =>
    c.json<Meta>({
      playerCount: PROFILES.length,
      examples: [
        "Left-footed centre-back under 24 who is comfortable on the ball, max £30m",
        "Pressing striker under 26 from the Eredivisie or Liga Portugal",
        ...(star ? [`A cheaper replacement for ${star.name}`] : []),
        "Creative number 10 who can dribble, under £20m",
      ],
    }),
  )
  .post("/interpret", async (c) => {
    const { query, engine } = await parseBody(c, InterpretRequestSchema);
    const ai = engineFor(engine);
    return c.json<Interpretation>({ spec: await ai.interpret(query), source: ai.source });
  })
  /** Public landing-page demo: keyword engine only, so anonymous visitors never spend Claude credit. */
  .post("/demo", async (c) => {
    const { query } = await parseBody(c, InterpretRequestSchema);
    const spec = parseQuery(query);
    const { total, matches } = search(spec);
    return c.json<DemoResponse>({ spec, total, matches: matches.slice(0, 5) });
  })
  .post("/search", async (c) => {
    const { spec } = await parseBody(c, SearchRequestSchema);
    return c.json(search(spec));
  })
  .get("/players/:id", (c) => {
    const player = requirePlayer(c.req.param("id"));
    return c.json<PlayerDetail>({ player, similar: similarPlayers(player) });
  })
  .post("/players/:id/report", async (c) => {
    const player = requirePlayer(c.req.param("id"));
    const { context, engine } = await parseBody(c, ReportRequestSchema);
    const ai = engineFor(engine);
    const report = await ai.report(player, context);
    return c.json<ReportResponse>({ report, checks: checkClaims(report, player), source: ai.source });
  })
  .post("/assistant", async (c) => {
    const { messages, context, engine } = await parseBody(c, AssistantRequestSchema);
    const ai = engineFor(engine);
    return c.json<AssistantResponse>(ai.source === "claude" ? await askClaude(messages, context) : askOffline(messages));
  })
  .post("/eval", async (c) => {
    const { engine } = await parseBody(c, EvalRequestSchema);
    const { source, passed, total, results } = await runQueryEval(engineFor(engine));
    return c.json<QueryEvalReport>({ source, passed, total, results: results.map(({ query, checks }) => ({ query, checks })) });
  });
