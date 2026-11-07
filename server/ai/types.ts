import type { AiSource, ClaimCheck, PlayerProfile, ScoutReport, SearchSpec } from "../../shared/types.ts";

/** Claude and the offline keyword/template fallback both implement this. */
export interface ScoutAi {
  source: AiSource;
  interpret(query: string): Promise<SearchSpec>;
  report(player: PlayerProfile, context?: string): Promise<ScoutReport>;
}

/** Guardrail: a "strength" must sit at or above the 60th percentile, a "weakness" at or below the 40th. */
export function checkClaims(report: ScoutReport, player: PlayerProfile): ClaimCheck[] {
  return [
    ...report.strengths.map(({ metric }) => ({ kind: "strength" as const, metric, percentile: player.percentiles[metric], supported: player.percentiles[metric] >= 60 })),
    ...report.weaknesses.map(({ metric }) => ({ kind: "weakness" as const, metric, percentile: player.percentiles[metric], supported: player.percentiles[metric] <= 40 })),
  ];
}
