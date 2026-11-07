import {
  KEY_METRICS,
  METRIC_IDS,
  METRICS,
  POSITIONS,
  type League,
  type MetricId,
  type PlayerProfile,
  type Position,
  type ScoutReport,
  type SearchSpec,
} from "../../shared/types.ts";
import { ordinal } from "../../shared/format.ts";
import { findByName, PROFILES } from "../players.ts";
import type { ScoutAi } from "./types.ts";

/**
 * No-API-key fallback: keyword rules for search and a template for reports.
 * It keeps the app usable offline and is the baseline the Claude version is compared with.
 */

const POSITION_WORDS: [RegExp, Position][] = [
  [/\b(left|right)[- ]?backs?\b|\bfull[- ]?backs?\b|\bwing[- ]?backs?\b/, "FB"],
  [/\bcent(re|er)[- ]?backs?\b|\bcentral defenders?\b|\bcbs?\b/, "CB"],
  [/\b(defensive|holding) midfielders?\b|\bnumber 6\b|\banchor\b/, "DM"],
  [/\bcentral midfielders?\b|\bbox[- ]to[- ]box\b|\bnumber 8\b/, "CM"],
  [/\battacking midfielders?\b|\bnumber 10\b|\bplaymakers?\b/, "AM"],
  [/\bwingers?\b|\bwide (forward|player)s?\b/, "W"],
  [/\bstrikers?\b|\bcent(re|er)[- ]?forwards?\b|\bnumber 9\b|(?<!wide )\bforwards?\b/, "ST"],
];

const METRIC_WORDS: [RegExp, MetricId[]][] = [
  [/progress|ball[- ]playing|line[- ]breaking/, ["prog_passes"]],
  [/\bpassing\b|\bpasser\b|tidy|retain/, ["pass_pct"]],
  [/carr(y|ies|ier)|driv(e|ing) forward/, ["prog_carries"]],
  [/dribbl|1v1|take[- ]?ons?/, ["dribbles"]],
  [/creat|chances|key pass|assist/, ["key_passes", "xa"]],
  [/goals?\b|finish|clinical|scorer/, ["goals", "xg"]],
  [/aerial|in the air|header|heading|dominant/, ["aerial_pct"]],
  [/tackl|intercept|ball[- ]winn|duels?/, ["tackles_int"]],
  [/\bpress(ing)?\b|work[- ]?rate|recover|energy/, ["recoveries"]],
];

const LEAGUE_WORDS: [RegExp, League][] = [
  [/premier league|england 1/, "England 1"],
  [/championship|england 2/, "England 2"],
  [/la liga|spain 1/, "Spain 1"],
  [/bundesliga|germany 1/, "Germany 1"],
  [/serie a|italy 1/, "Italy 1"],
  [/ligue 1|france 1/, "France 1"],
  [/eredivisie|netherlands 1/, "Netherlands 1"],
  [/primeira liga|liga portugal|portugal 1/, "Portugal 1"],
];

const NATIONALITY_WORDS: [RegExp, string][] = [
  [/\benglish\b/, "England"], [/\bspanish\b/, "Spain"], [/\bfrench\b/, "France"], [/\bgerman\b/, "Germany"],
  [/\bbrazilian\b/, "Brazil"], [/\bportuguese\b/, "Portugal"], [/\bdutch\b/, "Netherlands"],
  [/\bnigerian\b/, "Nigeria"], [/\bitalian\b/, "Italy"], [/\bargentin(e|ian)\b/, "Argentina"],
];

const matching = <T>(q: string, table: [RegExp, T][]) => [...new Set(table.filter(([re]) => re.test(q)).map(([, v]) => v))];
const num = (q: string, re: RegExp) => {
  const m = q.match(re);
  return m?.[1] ? Number(m[1]) : null;
};

function findReferencePlayer(query: string): PlayerProfile | undefined {
  const named = query.match(/(?:like|similar to|replacement for|replace|alternative to)\s+([\p{L}' -]+?)(?=[,.]|\s+(?:but|who|under|for|with|in|at)\b|$)/iu)?.[1];
  const plain = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return (named ? findByName(named) : undefined) ?? PROFILES.find((p) => plain(query).includes(plain(p.name)));
}

export function parseQuery(query: string): SearchSpec {
  const q = query.toLowerCase();
  const reference = findReferencePlayer(query);
  const youngest = num(q, /(?:over|older than|above)\s+(\d{2})\b(?!\s*(?:m\b|cm|million))/);
  const under = num(q, /(?:under|younger than|below)\s+(\d{2})\b(?!\s*(?:m\b|cm|million))/) ?? num(q, /\bu(\d{2})\b/);
  const minHeight = num(q, /(\d{3})\s*cm/) ?? (/\btall\b/.test(q) ? 185 : null);

  const spec: SearchSpec = {
    positions: matching(q, POSITION_WORDS),
    min_age: youngest !== null ? youngest + 1 : /experienced|veteran/.test(q) ? 27 : null,
    max_age: under !== null ? under - (/\bu\d{2}\b/.test(q) ? 0 : 1) : /\byoung\b|prospect|wonderkid/.test(q) ? 23 : null,
    foot: /left[- ]?(foot|sided)|\bleft[- ]?back\b/.test(q) ? "left" : /right[- ]?(foot|sided)|\bright[- ]?back\b/.test(q) ? "right" : "any",
    max_value_m: num(q, /(?:under|below|less than|max(?:imum)?|budget(?: of)?|up to)\s*£?\s*(\d+(?:\.\d+)?)\s*(?:m\b|million)/),
    min_height_cm: minHeight,
    leagues: matching(q, LEAGUE_WORDS),
    nationalities: matching(q, NATIONALITY_WORDS),
    priorities: matching(q, METRIC_WORDS).flat().map((metric) => ({ metric, weight: 2 })),
    similar_to: reference?.name ?? null,
    max_value_ratio: reference && /cheap/.test(q) ? 0.6 : null,
    explanation: "",
  };
  spec.explanation = `Keyword match (offline mode): ${describeSpec(spec)}.`;
  return spec;
}

export function describeSpec(s: SearchSpec): string {
  const parts = [
    s.positions.length ? s.positions.map((p) => POSITIONS[p]).join(" or ") : "any position",
    s.foot !== "any" && `${s.foot}-footed`,
    s.max_age !== null && `aged ≤ ${s.max_age}`,
    s.min_age !== null && `aged ≥ ${s.min_age}`,
    s.max_value_m !== null && `≤ £${s.max_value_m}m`,
    s.similar_to && `similar to ${s.similar_to}`,
    s.priorities.length && `prioritising ${s.priorities.map((p) => METRICS[p.metric].short).join(", ")}`,
  ];
  return parts.filter(Boolean).join(", ");
}

export function templateReport(p: PlayerProfile): ScoutReport {
  const ranked = [...METRIC_IDS].sort((a, b) => p.percentiles[b] - p.percentiles[a]);
  const strengths = ranked.filter((m) => p.percentiles[m] >= 70).slice(0, 3);
  const weaknesses = ranked.filter((m) => p.percentiles[m] <= 35).slice(-2);
  const keyScore = Math.round(KEY_METRICS[p.position].reduce((s, m) => s + p.percentiles[m], 0) / KEY_METRICS[p.position].length);
  const level = keyScore >= 75 ? "standout" : keyScore >= 55 ? "above-average" : keyScore >= 40 ? "solid" : "below-average";
  const pct = (m: MetricId) => `${METRICS[m].label} in the ${ordinal(p.percentiles[m])} percentile (${p.metrics[m]}${METRICS[m].unit})`;

  return {
    headline: `${level[0]!.toUpperCase()}${level.slice(1)} ${POSITIONS[p.position].toLowerCase()} by the numbers`,
    summary: `${p.name} (${p.age}, ${p.club}) averages the ${ordinal(keyScore)} percentile across the key metrics for a ${POSITIONS[p.position].toLowerCase()}. Template report generated without AI.`,
    strengths: strengths.map((m) => ({ metric: m, point: pct(m) })),
    weaknesses: weaknesses.map((m) => ({ metric: m, point: pct(m) })),
    best_role: POSITIONS[p.position],
    risks: [
      ...(p.minutes < 1500 ? [`Small sample: ${p.minutes} minutes`] : []),
      ...(p.age >= 30 ? ["Age 30+: limited resale value"] : []),
      ...(p.league !== "England 1" ? [`Output in ${p.league} may not translate to a stronger league`] : []),
    ],
    recommendation: keyScore >= 70 && p.age <= 28 ? "sign" : keyScore >= 50 ? "monitor" : "pass",
    confidence: p.minutes >= 2000 ? "medium" : "low",
  };
}

export const offlineAi: ScoutAi = {
  source: "offline",
  interpret: async (query) => parseQuery(query),
  report: async (player) => templateReport(player),
};
