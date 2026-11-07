import { KEY_METRICS, type MetricId, type PlayerProfile } from "./types.ts";

/**
 * Football-Manager-style ratings, derived openly from the data:
 * - attribute (1-20) = the metric's percentile against the same position, in steps of 5.
 * - ability (0-5 stars) = mean percentile over the position's key metrics.
 * - potential = ability plus age-based headroom. It is an estimate, and the UI says so.
 */

export const attribute = (percentile: number): number => Math.min(20, Math.max(1, Math.ceil(percentile / 5)));

/** Display bands for 1-20 values, used for colour and for the text label beside it. */
export type Band = "poor" | "fair" | "good" | "excellent";
export const band = (value: number): Band => (value >= 16 ? "excellent" : value >= 11 ? "good" : value >= 6 ? "fair" : "poor");

export const ATTRIBUTE_GROUPS: { label: string; metrics: MetricId[] }[] = [
  { label: "Attacking", metrics: ["goals", "xg", "shots"] },
  { label: "Creating", metrics: ["xa", "key_passes", "prog_passes"] },
  { label: "On the ball", metrics: ["prog_carries", "dribbles", "pass_pct"] },
  { label: "Defending", metrics: ["tackles_int", "aerial_pct", "recoveries"] },
];

/** Mean percentile across the position's key metrics, 0-100. */
export const keyScore = (p: PlayerProfile): number =>
  Math.round(KEY_METRICS[p.position].reduce((sum, m) => sum + p.percentiles[m], 0) / KEY_METRICS[p.position].length);

const halfStars = (score: number) => Math.round(score / 10) / 2;

/** Age-based headroom in stars: younger players have more room to grow. */
const headroom = (age: number) => (age <= 20 ? 2 : age <= 22 ? 1.5 : age <= 24 ? 1 : age <= 26 ? 0.5 : 0);

export interface Ability {
  current: number;
  potential: number;
  keyScore: number;
}

export function ability(p: PlayerProfile): Ability {
  const score = keyScore(p);
  const current = halfStars(score);
  return { current, potential: Math.min(5, current + headroom(p.age)), keyScore: score };
}
