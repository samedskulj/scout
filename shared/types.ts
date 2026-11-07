import { z } from "zod";


/* ---------- Football vocabulary ---------- */

export const POSITIONS = {
  CB: "Centre-back",
  FB: "Full-back",
  DM: "Defensive midfielder",
  CM: "Central midfielder",
  AM: "Attacking midfielder",
  W: "Winger",
  ST: "Striker",
} as const;
export type Position = keyof typeof POSITIONS;
export const PositionSchema = z.enum(Object.keys(POSITIONS) as [Position, ...Position[]]);

export const LEAGUES = [
  "England 1", "England 2", "Spain 1", "Germany 1", "Italy 1", "France 1", "Netherlands 1", "Portugal 1",
] as const;
export const LeagueSchema = z.enum(LEAGUES);
export type League = z.infer<typeof LeagueSchema>;

/** All metrics are per 90 minutes unless they're percentages. */
export const METRICS = {
  goals: { label: "Non-penalty goals", short: "Goals", unit: "/90" },
  xg: { label: "Non-penalty xG", short: "xG", unit: "/90" },
  shots: { label: "Shots", short: "Shots", unit: "/90" },
  xa: { label: "Expected assists", short: "xA", unit: "/90" },
  key_passes: { label: "Key passes", short: "Key passes", unit: "/90" },
  prog_passes: { label: "Progressive passes", short: "Prog. passes", unit: "/90" },
  prog_carries: { label: "Progressive carries", short: "Prog. carries", unit: "/90" },
  dribbles: { label: "Successful dribbles", short: "Dribbles", unit: "/90" },
  pass_pct: { label: "Pass completion", short: "Pass %", unit: "%" },
  tackles_int: { label: "Tackles + interceptions", short: "Tkl+Int", unit: "/90" },
  aerial_pct: { label: "Aerial duels won", short: "Aerial %", unit: "%" },
  recoveries: { label: "Ball recoveries", short: "Recoveries", unit: "/90" },
} as const;
export type MetricId = keyof typeof METRICS;
export const METRIC_IDS = Object.keys(METRICS) as [MetricId, ...MetricId[]];
export const MetricIdSchema = z.enum(METRIC_IDS);

/** What "good" means for each position when the scout doesn't say. */
export const KEY_METRICS: Record<Position, MetricId[]> = {
  CB: ["tackles_int", "aerial_pct", "prog_passes", "pass_pct", "recoveries"],
  FB: ["tackles_int", "prog_carries", "xa", "key_passes", "recoveries"],
  DM: ["tackles_int", "recoveries", "prog_passes", "pass_pct", "aerial_pct"],
  CM: ["prog_passes", "key_passes", "recoveries", "pass_pct", "prog_carries"],
  AM: ["xa", "key_passes", "dribbles", "xg", "prog_carries"],
  W: ["dribbles", "prog_carries", "xa", "xg", "key_passes"],
  ST: ["goals", "xg", "shots", "aerial_pct", "xa"],
};

export type Foot = "left" | "right" | "both";

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  foot: Foot;
  height_cm: number;
  club: string;
  league: League;
  minutes: number;
  market_value_m: number;
  contract_until: number;
  metrics: Record<MetricId, number>;
}

/** Percentile (0-100) of each metric against players in the same position. */
export type Percentiles = Record<MetricId, number>;

export interface PlayerProfile extends Player {
  percentiles: Percentiles;
}

/* ---------- Natural-language search ---------- */

export const SearchSpecSchema = z.object({
  positions: z.array(PositionSchema).describe("Positions wanted; empty means any"),
  min_age: z.number().int().nullable(),
  max_age: z.number().int().nullable(),
  foot: z.enum(["left", "right", "any"]).describe("Preferred foot; two-footed players match either"),
  max_value_m: z.number().nullable().describe("Maximum market value in £ millions"),
  min_height_cm: z.number().nullable(),
  leagues: z.array(LeagueSchema).describe("Leagues to search; empty means all"),
  nationalities: z.array(z.string()).describe("Nationalities wanted, e.g. Brazil; empty means any"),
  priorities: z
    .array(z.object({ metric: MetricIdSchema, weight: z.number().describe("1 = nice to have, 3 = essential") }))
    .describe("Metrics that define what the scout is looking for"),
  similar_to: z.string().nullable().describe("Name of a player whose profile the scout wants to replicate or replace"),
  max_value_ratio: z
    .number()
    .nullable()
    .describe("Budget relative to the similar_to player's value: 'cheaper' = 0.6, 'half the price' = 0.5; null otherwise"),
  explanation: z.string().describe("One sentence on how the request was interpreted, including assumptions"),
});
export type SearchSpec = z.infer<typeof SearchSpecSchema>;

export const EngineSchema = z.enum(["claude", "offline"]);

export const InterpretRequestSchema = z.object({
  query: z.string().trim().min(3, "Describe the player in a few words").max(500),
  engine: EngineSchema.optional(),
});
export const SearchRequestSchema = z.object({ spec: SearchSpecSchema });

export type AiSource = z.infer<typeof EngineSchema>;

export interface Interpretation {
  spec: SearchSpec;
  source: AiSource;
}

export interface Reason {
  metric: MetricId;
  percentile: number;
}

export interface Match {
  player: PlayerProfile;
  /** 0-100: weighted percentile, or profile similarity when searching for a similar player. */
  score: number;
  reasons: Reason[];
}

export interface SearchResponse {
  target: PlayerProfile | null;
  total: number;
  matches: Match[];
}

/* ---------- Scouting report ---------- */

export const ScoutReportSchema = z.object({
  headline: z.string().describe("One line a sporting director would remember"),
  summary: z.string().describe("Three or four sentences: profile, level, fit"),
  strengths: z.array(z.object({ metric: MetricIdSchema, point: z.string() })).describe("2-4, each tied to a metric"),
  weaknesses: z.array(z.object({ metric: MetricIdSchema, point: z.string() })).describe("1-3, each tied to a metric"),
  best_role: z.string().describe("Tactical role that suits the data, e.g. ball-playing centre-back in a back four"),
  risks: z.array(z.string()).describe("Age, sample size, league level, contract, value"),
  recommendation: z.enum(["sign", "monitor", "pass"]),
  confidence: z.enum(["low", "medium", "high"]),
});
export type ScoutReport = z.infer<typeof ScoutReportSchema>;

export const ReportRequestSchema = z.object({ context: z.string().max(500).optional(), engine: EngineSchema.optional() });

export const EvalRequestSchema = z.object({ engine: EngineSchema });

export interface QueryEvalReport {
  source: AiSource;
  passed: number;
  total: number;
  results: { query: string; checks: { field: string; pass: boolean }[] }[];
}

/** A claim the data doesn't back up, e.g. a "strength" in the 30th percentile. */
export interface ClaimCheck {
  kind: "strength" | "weakness";
  metric: MetricId;
  percentile: number;
  supported: boolean;
}

export interface ReportResponse {
  report: ScoutReport;
  checks: ClaimCheck[];
  source: AiSource;
}

export interface PlayerDetail {
  player: PlayerProfile;
  similar: Match[];
}

/* ---------- Scout assistant (chat with tool use) ---------- */

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const AssistantRequestSchema = z.object({
  messages: z.array(ChatTurnSchema).min(1).max(40),
  /** What the scout is looking at, so "him" and "this brief" make sense. */
  context: z.object({ selectedId: z.string().nullable(), brief: z.string().max(500).nullable() }).optional(),
  engine: EngineSchema.optional(),
});

/** One database call the assistant made, shown in the chat so its working is visible. */
export interface AssistantStep {
  tool: "search_players" | "get_player" | "compare_players" | "show_shortlist";
  summary: string;
}

export interface AssistantResponse {
  reply: string;
  /** Players the assistant put on the board, in its order, or null if it didn't change the board. */
  shortlist: { title: string; matches: Match[] } | null;
  /** Player to open in the profile panel. */
  focusId: string | null;
  steps: AssistantStep[];
  source: AiSource;
}

/** The landing page's live demo: keyword-engine read of the brief plus the top five. */
export interface DemoResponse {
  spec: SearchSpec;
  total: number;
  matches: Match[];
}

export interface Meta {
  playerCount: number;
  examples: string[];
}
