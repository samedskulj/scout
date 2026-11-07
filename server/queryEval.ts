import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { LeagueSchema, MetricIdSchema, PositionSchema, type SearchSpec } from "../shared/types.ts";
import type { ScoutAi } from "./ai/types.ts";
import { findByName } from "./players.ts";

/** Expectations are partial: only the fields a scout would agree on are checked. */
const CaseSchema = z.object({
  query: z.string(),
  expect: z.object({
    positions: z.array(PositionSchema).optional(),
    foot: z.enum(["left", "right", "any"]).optional(),
    min_age: z.number().optional(),
    max_age: z.number().optional(),
    max_value_m: z.number().optional(),
    leagues: z.array(LeagueSchema).optional(),
    nationalities: z.array(z.string()).optional(),
    similar_to: z.string().optional(),
    /** Each group needs at least one of its metrics among the priorities. */
    metrics_any: z.array(z.array(MetricIdSchema)).optional(),
  }),
});
type Case = z.infer<typeof CaseSchema>;

export const loadCases = (): Case[] =>
  z.array(CaseSchema).parse(JSON.parse(readFileSync(path.join(process.cwd(), "data", "query-evals.json"), "utf8")));

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
/** "Under 24" can fairly mean 23 or 24. */
const nearAge = (got: number | null, want: number) => got !== null && Math.abs(got - want) <= 1;

export function checkSpec(spec: SearchSpec, expect: Case["expect"]): { field: string; pass: boolean }[] {
  const checks: { field: string; pass: boolean }[] = [];
  const check = (field: string, pass: boolean) => checks.push({ field, pass });
  const priorities = spec.priorities.map((p) => p.metric);

  if (expect.positions) check("positions", sameSet(spec.positions, expect.positions));
  if (expect.foot) check("foot", spec.foot === expect.foot);
  if (expect.min_age !== undefined) check("min_age", nearAge(spec.min_age, expect.min_age));
  if (expect.max_age !== undefined) check("max_age", nearAge(spec.max_age, expect.max_age));
  if (expect.max_value_m !== undefined) check("max_value_m", spec.max_value_m === expect.max_value_m);
  if (expect.leagues) check("leagues", sameSet(spec.leagues, expect.leagues));
  if (expect.nationalities) check("nationalities", sameSet(spec.nationalities.map((n) => n.toLowerCase()), expect.nationalities.map((n) => n.toLowerCase())));
  if (expect.similar_to) check("similar_to", findByName(spec.similar_to ?? "")?.name === expect.similar_to);
  for (const group of expect.metrics_any ?? []) check(`priority:${group.join("|")}`, group.some((m) => priorities.includes(m)));
  return checks;
}

export async function runQueryEval(ai: ScoutAi) {
  const cases = loadCases();
  const results = await Promise.all(
    cases.map(async (c) => {
      const spec = await ai.interpret(c.query);
      return { query: c.query, spec, checks: checkSpec(spec, c.expect) };
    }),
  );
  const all = results.flatMap((r) => r.checks);
  return { source: ai.source, results, passed: all.filter((c) => c.pass).length, total: all.length };
}
