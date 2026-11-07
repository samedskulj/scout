import { generateStructured } from "../lib/index.ts";
import {
  LEAGUES,
  METRICS,
  POSITIONS,
  ScoutReportSchema,
  SearchSpecSchema,
  type PlayerProfile,
} from "../../shared/types.ts";
import { PROFILES } from "../players.ts";
import type { ScoutAi } from "./types.ts";

const list = (entries: [string, string][]) => entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");

const INTERPRET_SYSTEM = `You turn a football scout's request into a structured player search over a database of ${PROFILES.length} players.

Positions:
${list(Object.entries(POSITIONS))}

Metrics (per 90 unless %):
${list(Object.entries(METRICS).map(([id, m]) => [id, m.label]))}

Leagues: ${LEAGUES.join(", ")}. Market values are in £ millions.

Rules:
- Only set filters the scout asked for or clearly implied. "Young" means max_age 23; "experienced" means min_age 27.
- "Left-back" means position FB with foot left. "Number 6" is DM, "number 8" is CM, "number 10" is AM, "number 9" is ST.
- Priorities: the 2-5 metrics that capture the playing style asked for, weighted 1 (nice to have) to 3 (essential). Translate football language: "ball-playing" -> prog_passes and pass_pct; "good in the air" -> aerial_pct; "press" -> recoveries and tackles_int; "creative" -> key_passes and xa; "clinical" -> goals and xg; "ball carrier" -> prog_carries and dribbles.
- similar_to: the player named as a reference or as someone to replace, copied as written; null otherwise.
- You don't know player prices. For "cheaper"/"half the price" relative to the reference player, set max_value_ratio (0.6 / 0.5) and leave max_value_m null unless an amount is given.
- explanation: one plain sentence, mention any assumption you made.`;

const REPORT_SYSTEM = `You are an experienced football scout writing for a sporting director. Write a concise, evidence-based report.
- Base every claim on the data provided. Percentiles compare the player with others in the same position in this database; 50 is average.
- Strengths must come from metrics at or above the 60th percentile and weaknesses from metrics at or below the 40th. Tie each to its metric id.
- Weigh age, minutes played (sample size), league level, contract length and market value in the risks and recommendation.
- If the scout gave context about their need, judge fit against it.
- Plain football language. No hype, no invented events, injuries or anecdotes.`;

const playerForPrompt = (p: PlayerProfile) =>
  JSON.stringify({
    name: p.name, age: p.age, nationality: p.nationality, position: POSITIONS[p.position], foot: p.foot,
    height_cm: p.height_cm, club: p.club, league: p.league, minutes: p.minutes,
    market_value_gbp_m: p.market_value_m, contract_until: p.contract_until,
    metrics: Object.fromEntries(
      Object.entries(p.metrics).map(([id, value]) => [id, { value, percentile: p.percentiles[id as keyof typeof p.percentiles] }]),
    ),
  }, null, 1);

export const claudeAi: ScoutAi = {
  source: "claude",

  interpret: (query) =>
    generateStructured({ schema: SearchSpecSchema, system: INTERPRET_SYSTEM, prompt: `<request>${query}</request>`, effort: "low" }),

  report: (player, context) =>
    generateStructured({
      schema: ScoutReportSchema,
      system: REPORT_SYSTEM,
      prompt: `<player>\n${playerForPrompt(player)}\n</player>${context ? `\n<scout_context>${context}</scout_context>` : ""}`,
      effort: "medium",
    }),
};
