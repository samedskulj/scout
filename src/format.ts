import type { Tone } from "./ui/index.ts";
import { ordinal } from "../shared/format.ts";
import { METRICS, type PlayerProfile, type Reason } from "../shared/types.ts";

export { money, ordinal } from "../shared/format.ts";

export const percentileTone = (p: number): Tone => (p >= 80 ? "good" : p >= 60 ? "accent" : p >= 40 ? "neutral" : "bad");

export const reasonLabel = (r: Reason): string => `${METRICS[r.metric].short} ${ordinal(r.percentile)}`;

export const playerLine = (p: PlayerProfile): string => `${p.club} · ${p.league} · ${p.nationality}`;
