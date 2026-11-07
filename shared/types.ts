import { z } from "zod";

/*
 * Real players, found live: the AI searches the web (Transfermarkt, FBref, club and league sites) for every
 * brief and profile, and returns facts with the pages they came from. Photos and badges come from TheSportsDB.
 * Nothing here is invented test data; a value the AI couldn't find is null, never a guess.
 */

/* ---------- Football vocabulary ---------- */

export const POSITIONS = {
  GK: "Goalkeeper",
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

export type Foot = "left" | "right" | "both" | "unknown";

/* ---------- A real player, as the AI found him ---------- */

export const SourceSchema = z.object({
  title: z.string().describe("Site or page name, e.g. 'Transfermarkt' or 'FBref'"),
  url: z.string().describe("The page the facts came from"),
});
export type Source = z.infer<typeof SourceSchema>;

export const StatSchema = z.object({
  label: z.string().describe("Short stat name, e.g. 'Goals', 'xG per 90', 'Tackles won per 90', 'Pass completion %'"),
  value: z.string().describe("The value exactly as found, e.g. '12', '0.41', '87%'"),
});
export type Stat = z.infer<typeof StatSchema>;

const nullable = <T extends z.ZodType>(s: T, what: string) => s.nullable().describe(`${what}; null if no source states it`);

export const PlayerFactsSchema = z.object({
  name: z.string().describe("Full name as commonly written"),
  age: nullable(z.number().int(), "Current age"),
  birth_date: nullable(z.string(), "Date of birth, YYYY-MM-DD"),
  nationality: nullable(z.string(), "Main nationality"),
  position: PositionSchema.describe("Closest of GK, CB, FB, DM, CM, AM, W, ST"),
  role: z.string().describe("Detailed position as sources describe it, e.g. 'Left winger' or 'Right-back'"),
  foot: z.enum(["left", "right", "both", "unknown"]),
  height_cm: nullable(z.number().int(), "Height in cm"),
  club: nullable(z.string(), "Current club (or loan club, noted in role)"),
  league: nullable(z.string(), "Current league, e.g. 'Premier League'"),
  market_value_eur_m: nullable(z.number(), "Latest Transfermarkt market value in € millions"),
  contract_until: nullable(z.string(), "Contract expiry, e.g. 'Jun 2028'"),
  season: z.string().describe("The season the stats are from, e.g. '2025/26'"),
  appearances: nullable(z.number().int(), "League appearances this season"),
  minutes: nullable(z.number().int(), "League minutes this season"),
  goals: nullable(z.number().int(), "League goals this season"),
  assists: nullable(z.number().int(), "League assists this season"),
  key_stats: z.array(StatSchema).max(8).describe("3-8 stats that matter for his position and the brief, copied from sources"),
});
export type PlayerFacts = z.infer<typeof PlayerFactsSchema>;

/** Pictures from TheSportsDB, attached on the server after the AI has found the player. */
export interface PlayerMedia {
  photo: string | null;
  cutout: string | null;
  clubBadge: string | null;
}

export interface ScoutPlayer extends PlayerFacts, PlayerMedia {
  /** Stable id from name and birth date, so favourites and profiles line up across searches. */
  id: string;
  /** 0-100: how well he fits the brief, in the AI's judgement. */
  fit: number;
  fit_reason: string;
  sources: Source[];
}

/* ---------- Searching ---------- */

export const ScoutRequestSchema = z.object({
  query: z.string().trim().min(3, "Describe the player in a few words").max(500),
});

/** How the AI read the brief, shown to the scout beside the results. */
export const BriefReadSchema = z.object({
  summary: z.string().describe("One or two plain sentences on how the brief was read, including assumptions"),
  positions: z.array(PositionSchema).describe("Positions searched; empty means any"),
  filters: z.array(z.string()).describe("Short chips for each requirement, e.g. 'Left foot', 'Under 24', 'Max €35m', 'Premier League'"),
});
export type BriefRead = z.infer<typeof BriefReadSchema>;

export interface ScoutResponse {
  read: BriefRead;
  players: ScoutPlayer[];
  /** ISO date the web was searched; results are cached per day. */
  searchedAt: string;
}

/* ---------- Full profile ---------- */

export const ProfileRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  club: z.string().trim().max(120).nullable().optional(),
});

export const CareerRowSchema = z.object({
  season: z.string(),
  club: z.string(),
  appearances: z.number().int().nullable(),
  goals: z.number().int().nullable(),
});

export const ProfileExtraSchema = z.object({
  season_stats: z.array(StatSchema).max(20).describe("All useful stats for this season found in sources, per 90 where given"),
  career: z.array(CareerRowSchema).max(8).describe("Recent seasons, newest first"),
  profile: z.string().describe("Three or four sentences: playing style, form and situation, from sources"),
  recent_news: z.array(z.string()).max(4).describe("Up to four short, dated items: transfers, injuries, call-ups"),
});
export type ProfileExtra = z.infer<typeof ProfileExtraSchema>;

export interface PlayerProfile extends ScoutPlayer, ProfileExtra {}

/* ---------- Scouting report ---------- */

export const ScoutReportSchema = z.object({
  headline: z.string().describe("One line a sporting director would remember"),
  summary: z.string().describe("Three or four sentences: profile, level, fit"),
  strengths: z
    .array(z.object({ stat: z.string().describe("The exact label of the stat this rests on, from the profile"), point: z.string() }))
    .describe("2-4, each tied to a stat in the profile"),
  weaknesses: z
    .array(z.object({ stat: z.string().describe("The exact label of the stat this rests on, from the profile"), point: z.string() }))
    .describe("1-3, each tied to a stat in the profile"),
  best_role: z.string(),
  risks: z.array(z.string()).describe("Age, minutes, league level, contract, value, injuries"),
  recommendation: z.enum(["sign", "monitor", "pass"]),
  confidence: z.enum(["low", "medium", "high"]),
});
export type ScoutReport = z.infer<typeof ScoutReportSchema>;

/** A report claim checked against the profile: does the stat it names actually exist there? */
export interface ClaimCheck {
  kind: "strength" | "weakness";
  stat: string;
  /** The value found in the profile, or null when the claim names a stat the profile doesn't have. */
  value: string | null;
  supported: boolean;
}

export interface ReportResponse {
  report: ScoutReport;
  checks: ClaimCheck[];
}

/* ---------- Assistant ---------- */

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const AssistantRequestSchema = z.object({
  messages: z.array(ChatTurnSchema).min(1).max(40),
  /** What the scout is looking at, so "him" and "this brief" make sense. */
  context: z
    .object({
      selected: z.string().max(200).nullable(),
      brief: z.string().max(500).nullable(),
      board: z.array(z.string().max(200)).max(20),
    })
    .optional(),
});

export const ASSISTANT_TOOLS = ["web_search", "show_players", "lookup_real_player", "lookup_club"] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];

export interface AssistantStep {
  tool: AssistantTool;
  summary: string;
}

/* ---------- Real-world cards (TheSportsDB) ---------- */

export interface RealPlayer {
  kind: "player";
  id: string;
  name: string;
  club: string | null;
  nationality: string | null;
  position: string | null;
  born: string | null;
  height: string | null;
  number: string | null;
  photo: string | null;
  cutout: string | null;
  clubBadge: string | null;
  source: string;
}

export interface RealClub {
  kind: "club";
  id: string;
  name: string;
  league: string | null;
  country: string | null;
  stadium: string | null;
  founded: number | null;
  badge: string | null;
  colours: string[];
  source: string;
}

export type RealCard = RealPlayer | RealClub;

export interface AssistantResponse {
  reply: string;
  /** Players the assistant put on the board, or null if it didn't change the board. */
  board: { title: string; players: ScoutPlayer[] } | null;
  steps: AssistantStep[];
  cards: RealCard[];
  sources: Source[];
}

/** The landing page's live demo. */
export type DemoResponse = ScoutResponse;

export interface Meta {
  examples: string[];
}

/** Example briefs shown in the app and on the landing page; their results are cached for the day. */
export const EXAMPLE_BRIEFS = [
  "Left-footed centre-back under 24, comfortable on the ball, max €35m",
  "Pressing striker under 26 from the Eredivisie or Liga Portugal",
  "Creative number 10 under 23 who can dribble, under €25m",
  "Experienced goalkeeper on an expiring contract",
];
