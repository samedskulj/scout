import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  BriefReadSchema,
  PlayerFactsSchema,
  ProfileExtraSchema,
  ScoutReportSchema,
  SourceSchema,
  type ClaimCheck,
  type PlayerFacts,
  type PlayerProfile,
  type ScoutPlayer,
  type ScoutReport,
  type ScoutResponse,
  type Source,
} from "../../shared/types.ts";
import { fallbackParams, generateStructured, getClient, hash, LlmError, model, readCache, writeCache } from "../lib/index.ts";
import { findPlayerMedia } from "../realworld.ts";

/**
 * Live scouting: the AI searches the web for real, current players and hands back structured facts through a
 * submit tool, each with the pages they came from. Code then drops sources the search never returned, attaches
 * photos, and caches the answer for the day.
 */

export const today = () => new Date().toISOString().slice(0, 10);

/** What the AI submits for each player found. */
export const FoundPlayerSchema = PlayerFactsSchema.extend({
  fit: z.number().int().min(0).max(100).describe("How well he fits the brief, 0-100, in your judgement"),
  fit_reason: z.string().describe("One sentence: why he fits, with the numbers that show it"),
  sources: z.array(SourceSchema).min(1).max(5).describe("Pages from your searches that these facts came from"),
});
type FoundPlayer = z.infer<typeof FoundPlayerSchema>;

/** The same player after code has added an id and pictures; also what the cache stores. */
export const ScoutPlayerSchema = FoundPlayerSchema.extend({
  id: z.string(),
  photo: z.string().nullable(),
  cutout: z.string().nullable(),
  clubBadge: z.string().nullable(),
});

const SEARCH_RULES = `How to research:
- Today is {today}. Use web_search for everything: current club, age, foot, height, market value, contract and this season's stats. Your own memory is out of date; never rely on it for a fact.
- Good sources: Transfermarkt (club, value in €, contract, foot, height, date of birth), FBref or the league's own site (season stats, per-90 numbers, xG), club sites and reputable news (transfers, injuries).
- Market value matters to scouts: if Transfermarkt doesn't come up, take it from another site that publishes one (FootballTransfers, Sofascore, Soccerway) rather than leaving it null.
- Only report what a source states. If you can't find a value, set it to null. Never estimate or round a stat into existence.
- key_stats: the 3-8 numbers that matter most for his position and the brief, with labels that say what they are ("xG per 90", "Progressive passes per 90", "Aerial duels won %", "Clean sheets").
- Every player needs at least one source URL that appeared in your search results.
- You have a limited number of searches ({budget}). Spend a few finding candidates (lists, scouting articles, Transfermarkt or FBref searches), then about one per player to confirm his club, value, foot and stats. Make each search count.`;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const playerId = (p: Pick<PlayerFacts, "name" | "birth_date" | "club">) => `${slug(p.name)}-${slug(p.birth_date ?? p.club ?? "x")}`;

/** Every URL the web search returned in this run, so cited sources can be checked against them. */
function collectUrls(message: Anthropic.Beta.BetaMessage, into: Set<string>) {
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string") into.add(o.url);
    for (const val of Object.values(o)) if (typeof val === "object") walk(val);
  };
  for (const block of message.content) if (/web_(search|fetch)/.test(block.type)) walk(block);
}

const sameUrl = (a: string, b: string) => a.replace(/[#?].*$/, "").replace(/\/$/, "") === b.replace(/[#?].*$/, "").replace(/\/$/, "");

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Keep only sources the search actually returned: the exact page, or failing that a page on a site the
 * search visited. If the result format gave us no URLs at all, keep them as cited.
 */
function checkedSources(sources: Source[], seen: Set<string>): Source[] {
  if (!seen.size) return sources;
  const exact = sources.filter((s) => [...seen].some((u) => sameUrl(u, s.url)));
  if (exact.length) return exact;
  const hosts = new Set([...seen].map(host));
  return sources.filter((s) => hosts.has(host(s.url)));
}

/** Attach id and pictures; drop players with no checkable source. */
export async function hydratePlayers(found: FoundPlayer[], seen: Set<string>): Promise<ScoutPlayer[]> {
  const kept = found.map((p) => ({ ...p, sources: checkedSources(p.sources, seen) })).filter((p) => p.sources.length > 0);
  return Promise.all(
    kept.map(async (p) => ({
      ...p,
      id: playerId(p),
      ...(await findPlayerMedia(p.name, p.club)),
    })),
  );
}

interface AgentRun<T> {
  system: string;
  prompt: string;
  submit: { name: string; description: string; schema: z.ZodType<T> };
  maxSearches: number;
  effort?: "low" | "medium" | "high";
  job?: Job;
}

/** Live progress for the UI: each web search as it runs. */
export type Progress = (line: string) => void;

/** A running request: where progress goes, and a signal that fires if the browser stops listening. */
export interface Job {
  progress?: Progress;
  signal?: AbortSignal;
}

/** The query of a web search block, as soon as that block has streamed in. */
export function searchQuery(block: Anthropic.Beta.BetaContentBlock): string | null {
  if (block.type !== "server_tool_use" || block.name !== "web_search") return null;
  const q = (block.input as { query?: unknown } | null)?.query;
  return typeof q === "string" ? q : null;
}

/** One research run: web search plus a submit tool. Returns what was submitted and every URL the search saw. */
export async function research<T>({ system, prompt, submit, maxSearches, effort = "medium", job }: AgentRun<T>): Promise<{ value: T; urls: Set<string> }> {
  let submitted: T | undefined;
  const urls = new Set<string>();

  const submitTool = betaZodTool({
    name: submit.name,
    description: submit.description,
    inputSchema: submit.schema as z.ZodType<T> & z.ZodObject,
    // The submission can be long; stream it as it is written (betaZodTool validates it before run()).
    eager_input_streaming: true,
    run: (input) => {
      submitted = input as T;
      return "Received. Reply with one short sentence and stop.";
    },
  });

  const runner = getClient().beta.messages.toolRunner({
    model: model(),
    max_tokens: 16000,
    max_iterations: maxSearches + 6,
    system: system.replace("{today}", today()).replace("{budget}", String(maxSearches)),
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }, submitTool],
    messages: [{ role: "user", content: prompt }],
    output_config: { effort },
    stream: true,
    ...fallbackParams(),
  }, { signal: job?.signal });

  const onProgress = job?.progress;
  let last: Anthropic.Beta.BetaMessage | undefined;
  for await (const stream of runner) {
    // Each search shows up the moment its block finishes streaming, not when the whole turn ends.
    stream.on("contentBlock", (block) => {
      const q = searchQuery(block);
      if (q) onProgress?.(`Searching: ${q}`);
      else if (block.type === "tool_use") onProgress?.("Writing up the results");
    });
    const message = await stream.finalMessage();
    collectUrls(message, urls);
    last = message;
  }
  if (last?.stop_reason === "refusal") throw new LlmError("The AI declined this request.");
  if (submitted === undefined) throw new LlmError("The AI finished without returning results. Try again, or reword the brief.");
  return { value: submitted, urls };
}

/* ---------- Brief → shortlist ---------- */

const SCOUT_SYSTEM = `You are a football recruitment analyst. A scout gives you a brief; you find real, currently active professional players who fit it, using live web search.

${SEARCH_RULES}

How to choose:
- Treat stated limits as hard filters: position, age, foot, budget, league, nationality. Read "under 24" as 23 or younger. The scout may give budgets in £; Transfermarkt values are in €, so convert at about €1.17 per £1 and say so in the summary.
- Prefer players with real minutes this season. Order best fit first. If fewer players truly fit, return fewer rather than stretching the brief.
- fit: 90+ fits everything with strong numbers; 70-89 fits with a caveat; below 70 only if nothing better exists.

When done, call submit_shortlist once with your read of the brief and the players.`;

const ShortlistSubmission = z.object({ read: BriefReadSchema, players: z.array(FoundPlayerSchema).max(10) });
const CachedShortlist = z.object({ read: BriefReadSchema, players: z.array(ScoutPlayerSchema), searchedAt: z.string() });

export async function scoutBrief(query: string, limit = 8, job?: Job): Promise<ScoutResponse> {
  const key = hash({ kind: "scout-live-v3", model: model(), query: query.trim().toLowerCase(), limit, day: today() });
  const cached = await readCache(key, CachedShortlist);
  if (cached) return cached;

  const { value, urls } = await research({
    system: SCOUT_SYSTEM,
    prompt: `<brief>${query}</brief>\nFind ${limit} players if that many genuinely fit.`,
    submit: { name: "submit_shortlist", description: "Submit your read of the brief and the players you found, best fit first.", schema: ShortlistSubmission },
    maxSearches: limit <= 5 ? 12 : 16,
    job,
  });
  job?.progress?.(`Checking sources and finding photos for ${value.players.length} players`);

  const result: ScoutResponse = {
    read: value.read,
    players: (await hydratePlayers(value.players, urls)).sort((a, b) => b.fit - a.fit),
    searchedAt: today(),
  };
  await writeCache(key, result);
  return result;
}

/* ---------- One player in depth ---------- */

const PROFILE_SYSTEM = `You are a football recruitment analyst building an up-to-date profile of one real player with live web search.

${SEARCH_RULES}

- Fill season_stats with every useful number you find for this season (per 90 where the source gives it), labels as the source names them.
- career: his last few seasons, newest first. recent_news: short items with a month and year.
- fit and fit_reason describe him in general terms (there is no brief here): fit is your overall rating of his level this season, 0-100.

When done, call submit_profile once.`;

const ProfileSubmission = FoundPlayerSchema.extend(ProfileExtraSchema.shape);
const CachedProfile = ScoutPlayerSchema.extend(ProfileExtraSchema.shape);

export async function fetchProfile(name: string, club?: string | null, job?: Job): Promise<PlayerProfile> {
  const key = hash({ kind: "profile-live-v3", model: model(), name: name.trim().toLowerCase(), club: club?.trim().toLowerCase() ?? null, day: today() });
  const cached = await readCache(key, CachedProfile);
  if (cached) return cached;

  const { value, urls } = await research({
    system: PROFILE_SYSTEM,
    prompt: `<player>${name}${club ? ` (${club})` : ""}</player>`,
    submit: { name: "submit_profile", description: "Submit the player's profile.", schema: ProfileSubmission },
    maxSearches: 8,
    job,
  });
  const [hydrated] = await hydratePlayers([value], urls);
  if (!hydrated) throw new LlmError(`Couldn't find a reliable source for ${name}. Check the spelling, or add his club.`);
  const profile: PlayerProfile = { ...value, ...hydrated };
  await writeCache(key, profile);
  return profile;
}

/* ---------- Report, checked against the profile ---------- */

const REPORT_SYSTEM = `You are an experienced football scout writing for a sporting director. Write a concise, evidence-based report from the profile provided.
- Base every claim on the profile's data. Tie each strength and weakness to one stat, using that stat's label exactly as it appears in the profile.
- Weigh age, minutes, league level, contract, market value and recent news in the risks and recommendation.
- If the scout gave a brief, judge fit against it.
- Plain football language. No hype, nothing the profile doesn't support.`;

const statsOf = (p: PlayerProfile) => {
  const core: [string, unknown][] = [
    ["Age", p.age],
    ["Appearances", p.appearances],
    ["Minutes", p.minutes],
    ["Goals", p.goals],
    ["Assists", p.assists],
    ["Market value", p.market_value_eur_m !== null ? `€${p.market_value_eur_m}m` : null],
    ["Height", p.height_cm !== null ? `${p.height_cm} cm` : null],
  ];
  const all = [...core.filter(([, v]) => v !== null).map(([label, v]) => ({ label, value: String(v) })), ...p.key_stats, ...p.season_stats];
  return new Map(all.map((s) => [s.label.trim().toLowerCase(), s.value]));
};

/** Guardrail: every strength and weakness must name a stat that is actually in the profile. */
export function checkClaims(report: ScoutReport, profile: PlayerProfile): ClaimCheck[] {
  const stats = statsOf(profile);
  const check = (kind: ClaimCheck["kind"], stat: string): ClaimCheck => {
    const value = stats.get(stat.trim().toLowerCase()) ?? null;
    return { kind, stat, value, supported: value !== null };
  };
  return [...report.strengths.map((s) => check("strength", s.stat)), ...report.weaknesses.map((s) => check("weakness", s.stat))];
}

export function writeReport(profile: PlayerProfile, brief?: string): Promise<ScoutReport> {
  const { photo: _p, cutout: _c, clubBadge: _b, sources: _s, ...data } = profile;
  return generateStructured({
    schema: ScoutReportSchema,
    system: REPORT_SYSTEM,
    prompt: `<profile>\n${JSON.stringify(data, null, 1)}\n</profile>${brief ? `\n<scout_brief>${brief}</scout_brief>` : ""}`,
    effort: "medium",
  });
}
