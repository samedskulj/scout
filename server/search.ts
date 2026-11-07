import {
  KEY_METRICS,
  METRIC_IDS,
  type Match,
  type MetricId,
  type PlayerProfile,
  type SearchResponse,
  type SearchSpec,
} from "../shared/types.ts";
import { findByName, PROFILES } from "./players.ts";

/** Below this, per-90 numbers are too noisy to rank on. */
export const MIN_MINUTES = 900;
const MAX_RESULTS = 30;

type Weights = Partial<Record<MetricId, number>>;

const clampWeight = (w: number) => Math.min(3, Math.max(1, Math.round(w)));

const priorityWeights = (spec: SearchSpec): Weights =>
  Object.fromEntries(spec.priorities.map((p) => [p.metric, clampWeight(p.weight)]));

const keyWeights = (player: PlayerProfile): Weights => Object.fromEntries(KEY_METRICS[player.position].map((m) => [m, 1]));

/** The scout's priorities, or the position's key metrics when they gave none. */
const weightsFor = (spec: SearchSpec, player: PlayerProfile): Weights =>
  spec.priorities.length ? priorityWeights(spec) : keyWeights(player);

function passesFilters(p: PlayerProfile, spec: SearchSpec): boolean {
  const lower = (s: string) => s.toLowerCase();
  return (
    p.minutes >= MIN_MINUTES &&
    (spec.positions.length === 0 || spec.positions.includes(p.position)) &&
    (spec.min_age === null || p.age >= spec.min_age) &&
    (spec.max_age === null || p.age <= spec.max_age) &&
    (spec.foot === "any" || p.foot === spec.foot || p.foot === "both") &&
    (spec.max_value_m === null || p.market_value_m <= spec.max_value_m) &&
    (spec.min_height_cm === null || p.height_cm >= spec.min_height_cm) &&
    (spec.leagues.length === 0 || spec.leagues.includes(p.league)) &&
    (spec.nationalities.length === 0 || spec.nationalities.some((n) => lower(n) === lower(p.nationality)))
  );
}

/** The three most important metrics for this search, as evidence for the ranking. */
function reasonsFor(p: PlayerProfile, weights: Weights): Match["reasons"] {
  return (Object.entries(weights) as [MetricId, number][])
    .sort(([a, wa], [b, wb]) => wb - wa || p.percentiles[b] - p.percentiles[a])
    .slice(0, 3)
    .map(([metric]) => ({ metric, percentile: p.percentiles[metric] }));
}

/** Weighted mean percentile over the metrics that matter. */
export function rankScore(p: PlayerProfile, weights: Weights): number {
  const entries = Object.entries(weights) as [MetricId, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  return Math.round(entries.reduce((sum, [m, w]) => sum + w * p.percentiles[m], 0) / total);
}

/** 100 = identical percentile profile. Every metric counts; the scout's priorities count extra. */
export function similarity(a: PlayerProfile, b: PlayerProfile, extra: Weights = {}): number {
  let diff = 0;
  let total = 0;
  for (const m of METRIC_IDS) {
    const w = 1 + (extra[m] ?? 0);
    diff += w * Math.abs(a.percentiles[m] - b.percentiles[m]);
    total += w;
  }
  return Math.round(100 - diff / total);
}

export function search(spec: SearchSpec): SearchResponse {
  const target = spec.similar_to ? (findByName(spec.similar_to) ?? null) : null;
  // A reference player fills in what the scout left implicit: same position, budget relative to their value.
  const effective: SearchSpec = target
    ? {
        ...spec,
        positions: spec.positions.length ? spec.positions : [target.position],
        max_value_m: spec.max_value_m ?? (spec.max_value_ratio ? target.market_value_m * spec.max_value_ratio : null),
      }
    : spec;

  const matches = PROFILES.filter((p) => p.id !== target?.id && passesFilters(p, effective))
    .map((p): Match => {
      const weights = weightsFor(spec, p);
      return {
        player: p,
        score: target ? similarity(p, target, priorityWeights(spec)) : rankScore(p, weights),
        reasons: reasonsFor(p, weights),
      };
    })
    .sort((a, b) => b.score - a.score);

  return { target, total: matches.length, matches: matches.slice(0, MAX_RESULTS) };
}

/** Closest profiles in the same position, any league or price. */
export function similarPlayers(target: PlayerProfile, limit = 6): Match[] {
  return PROFILES.filter((p) => p.id !== target.id && p.position === target.position && p.minutes >= MIN_MINUTES)
    .map((p) => ({ player: p, score: similarity(p, target), reasons: reasonsFor(p, keyWeights(p)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
