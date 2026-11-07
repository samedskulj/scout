import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ability, attribute } from "../../shared/attributes.ts";
import { money } from "../../shared/format.ts";
import {
  LEAGUES,
  METRIC_IDS,
  METRICS,
  POSITIONS,
  SearchSpecSchema,
  type AssistantResponse,
  type AssistantStep,
  type ChatTurn,
  type Match,
  type PlayerProfile,
  type SearchSpec,
} from "../../shared/types.ts";
import { fallbackParams, getClient, hash, LlmError, model, readCache, writeCache } from "../lib/index.ts";
import { findByName, getPlayer, PROFILES } from "../players.ts";
import { search, similarPlayers, similarity } from "../search.ts";
import { describeSpec, parseQuery } from "./offline.ts";

/**
 * The scout assistant: Claude answers in chat and calls the same deterministic search and
 * profile code the rest of the app uses. It never sees a number it didn't get from a tool.
 */

export interface AssistantContext {
  selectedId: string | null;
  brief: string | null;
}

const SYSTEM = `You are the chief scout's assistant at a football club's recruitment department. You help a scout find and judge players in a database of ${PROFILES.length} fictional outfield players across these leagues: ${LEAGUES.join(", ")}.

How the data works:
- 12 metrics per player, per 90 minutes or as percentages. Each has a percentile against players in the same position (50 = average for the position).
- Each metric is also shown to the scout as a 1-20 attribute (percentile / 5, rounded up), like a football management game. 16-20 is excellent, 11-15 good, 6-10 fair, 1-5 poor.
- Ability stars (0-5) are the mean percentile over the position's key metrics. Potential stars add age-based headroom and are only an estimate.
- Market values are in £ millions. Players under 900 minutes are left out of searches.

How to work:
- Get every fact from a tool. Never state a number, club, age or price you did not read from a tool result in this conversation.
- Use search_players for anything that sounds like a brief. Translate football language into priorities: "ball-playing" -> prog_passes, pass_pct; "good in the air" -> aerial_pct; "presses" -> recoveries, tackles_int; "creative" -> key_passes, xa; "clinical" -> goals, xg; "ball carrier" -> prog_carries, dribbles.
- When you recommend players, call show_shortlist so they appear on the scout's board, best first, and set focus_id to the one you'd open first.
- If a request is outside the data (injuries, character, wages), say the database doesn't cover it.

How to reply:
- Speak like a scout, not a data scientist. Lead with the answer.
- Under 120 words. Name players with one or two numbers that justify the pick, e.g. "Prog. passes 17/20".
- No markdown headings or tables; short paragraphs or a short list are fine.`;

const positionLabel = (p: PlayerProfile) => POSITIONS[p.position];

/** A compact line per player, enough for Claude to reason without flooding the context. */
function playerSummary(p: PlayerProfile, score?: number) {
  const a = ability(p);
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    position: positionLabel(p),
    foot: p.foot,
    club: p.club,
    league: p.league,
    value: money(p.market_value_m),
    ability_stars: a.current,
    potential_stars_estimate: a.potential,
    ...(score !== undefined ? { match_score: score } : {}),
  };
}

function playerDetail(p: PlayerProfile) {
  return {
    ...playerSummary(p),
    nationality: p.nationality,
    height_cm: p.height_cm,
    minutes: p.minutes,
    contract_until: p.contract_until,
    attributes: Object.fromEntries(
      METRIC_IDS.map((m) => [
        m,
        { label: METRICS[m].label, value: `${p.metrics[m]}${METRICS[m].unit}`, percentile: p.percentiles[m], attribute: attribute(p.percentiles[m]) },
      ]),
    ),
  };
}

function resolvePlayer(ref: string): PlayerProfile | undefined {
  return getPlayer(ref.trim()) ?? findByName(ref);
}

const SearchInput = SearchSpecSchema.omit({ explanation: true }).partial();

const fullSpec = (input: z.infer<typeof SearchInput>): SearchSpec => ({
  positions: input.positions ?? [],
  min_age: input.min_age ?? null,
  max_age: input.max_age ?? null,
  foot: input.foot ?? "any",
  max_value_m: input.max_value_m ?? null,
  min_height_cm: input.min_height_cm ?? null,
  leagues: input.leagues ?? [],
  nationalities: input.nationalities ?? [],
  priorities: input.priorities ?? [],
  similar_to: input.similar_to ?? null,
  max_value_ratio: input.max_value_ratio ?? null,
  explanation: "",
});

const CachedSchema = z.object({
  reply: z.string(),
  shortlist: z.object({ title: z.string(), ids: z.array(z.string()) }).nullable(),
  focusId: z.string().nullable(),
  steps: z.array(z.object({ tool: z.enum(["search_players", "get_player", "compare_players", "show_shortlist"]), summary: z.string() })),
});
type Cached = z.infer<typeof CachedSchema>;

/** Rebuild full matches for the UI from the ids the assistant picked. */
function hydrate(cached: Cached, scores: Map<string, number>): AssistantResponse {
  const matches = (cached.shortlist?.ids ?? [])
    .map((id) => getPlayer(id))
    .filter((p): p is PlayerProfile => Boolean(p))
    .map((p): Match => ({ player: p, score: scores.get(p.id) ?? ability(p).keyScore, reasons: [] }));
  return {
    reply: cached.reply,
    shortlist: cached.shortlist && matches.length ? { title: cached.shortlist.title, matches } : null,
    focusId: cached.focusId,
    steps: cached.steps,
    source: "claude",
  };
}

export async function askClaude(turns: ChatTurn[], context?: AssistantContext): Promise<AssistantResponse> {
  const selected = context?.selectedId ? getPlayer(context.selectedId) : undefined;
  const contextNote = [
    selected && `The scout has ${selected.name} (id ${selected.id}) open in the profile panel.`,
    context?.brief && `The current brief on screen: "${context.brief}".`,
  ]
    .filter(Boolean)
    .join(" ");

  const key = hash({ kind: "assistant", model: model(), system: SYSTEM, turns, contextNote });
  const scores = new Map<string, number>();
  const cached = await readCache(key, CachedSchema);
  if (cached) return hydrate(cached, scores);

  const steps: AssistantStep[] = [];
  let shortlist: Cached["shortlist"] = null;
  let focusId: string | null = null;

  const tools = [
    betaZodTool({
      name: "search_players",
      description:
        "Search the database with filters and ranking priorities. Returns the total number of matches and the top 10, ranked by weighted percentile (or by profile similarity when similar_to is set). Leave out any filter the scout didn't ask for.",
      inputSchema: SearchInput,
      run: (input) => {
        const spec = fullSpec(input);
        const res = search(spec);
        for (const m of res.matches) scores.set(m.player.id, m.score);
        steps.push({ tool: "search_players", summary: describeSpec(spec) || "all players" });
        return JSON.stringify({
          total: res.total,
          reference_player: res.target ? playerSummary(res.target) : null,
          top: res.matches.slice(0, 10).map((m) => ({
            ...playerSummary(m.player, m.score),
            drivers: m.reasons.map((r) => `${METRICS[r.metric].short} ${attribute(r.percentile)}/20 (${r.percentile}th pct)`),
          })),
        });
      },
    }),
    betaZodTool({
      name: "get_player",
      description: "Full profile of one player: every metric with its value, percentile and 1-20 attribute, plus contract, minutes and the three most similar profiles.",
      inputSchema: z.object({ player: z.string().describe("Player id (e.g. p042) or name") }),
      run: ({ player }) => {
        const p = resolvePlayer(player);
        if (!p) return `No player found for "${player}".`;
        steps.push({ tool: "get_player", summary: p.name });
        return JSON.stringify({
          ...playerDetail(p),
          most_similar: similarPlayers(p, 3).map((m) => ({ ...playerSummary(m.player), similarity: m.score })),
        });
      },
    }),
    betaZodTool({
      name: "compare_players",
      description: "Compare 2-4 players side by side on every metric (percentile and 1-20 attribute), with profile similarity to the first player.",
      inputSchema: z.object({ players: z.array(z.string()).min(2).max(4).describe("Player ids or names; the first is the reference") }),
      run: ({ players }) => {
        const found = players.map(resolvePlayer);
        const missing = players.filter((_, i) => !found[i]);
        if (missing.length) return `Not found: ${missing.join(", ")}.`;
        const list = found as PlayerProfile[];
        steps.push({ tool: "compare_players", summary: list.map((p) => p.name).join(" vs ") });
        return JSON.stringify({
          players: list.map((p, i) => ({ ...playerSummary(p), ...(i > 0 ? { similarity_to_first: similarity(p, list[0]!) } : {}) })),
          metrics: Object.fromEntries(
            METRIC_IDS.map((m) => [METRICS[m].short, list.map((p) => `${attribute(p.percentiles[m])}/20 (${p.percentiles[m]}th)`)]),
          ),
        });
      },
    }),
    betaZodTool({
      name: "show_shortlist",
      description: "Put players on the scout's board, best first. Call this whenever you recommend players. Replaces the current board.",
      inputSchema: z.object({
        title: z.string().max(80).describe("Short board title, e.g. 'Cheaper alternatives to Moreira'"),
        player_ids: z.array(z.string()).min(1).max(12),
        focus_id: z.string().nullable().describe("The player to open in the profile panel, usually the first"),
      }),
      run: ({ title, player_ids, focus_id }) => {
        const ids = player_ids.map((id) => resolvePlayer(id)?.id).filter((id): id is string => Boolean(id));
        if (!ids.length) return "None of those ids exist. Use ids from search results.";
        shortlist = { title, ids };
        focusId = focus_id ? (resolvePlayer(focus_id)?.id ?? ids[0]!) : ids[0]!;
        steps.push({ tool: "show_shortlist", summary: `${ids.length} players: ${title}` });
        return `Board updated with ${ids.length} players.`;
      },
    }),
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t, i) =>
    i === turns.length - 1 && t.role === "user" && contextNote
      ? { role: "user", content: `${t.content}\n\n<screen_context>${contextNote}</screen_context>` }
      : { role: t.role, content: t.content },
  );

  const final = await getClient().beta.messages.toolRunner({
    model: model(),
    max_tokens: 16000,
    max_iterations: 8,
    system: SYSTEM,
    tools,
    messages,
    output_config: { effort: "medium" },
    ...fallbackParams(),
  });

  if (final.stop_reason === "refusal") throw new LlmError("Claude declined this request.");
  if (final.stop_reason === "max_tokens") throw new LlmError("Claude's response was cut off.");
  const reply = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const result: Cached = { reply: reply || "Done. The board is updated.", shortlist, focusId, steps };
  await writeCache(key, result);
  return hydrate(result, scores);
}

/** No API key: read the last message as a brief with the keyword parser and show the top of the search. */
export function askOffline(turns: ChatTurn[]): AssistantResponse {
  const last = [...turns].reverse().find((t) => t.role === "user")?.content ?? "";
  const spec = parseQuery(last);
  const res = search(spec);
  const top = res.matches.slice(0, 8);
  const summary = describeSpec(spec) || "all players";
  return {
    reply: top.length
      ? `Offline mode, so I can only match keywords. I read that as: ${summary}. ${res.total} players fit; the top ${top.length} are on the board. Add an Anthropic API key for the full assistant.`
      : `Offline mode, so I can only match keywords, and nothing fits "${summary}". Try loosening the brief, or add an Anthropic API key for the full assistant.`,
    shortlist: top.length ? { title: `Keyword search: ${summary}`, matches: top } : null,
    focusId: top[0]?.player.id ?? null,
    steps: [{ tool: "search_players", summary }],
    source: "offline",
  };
}
