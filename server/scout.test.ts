import { describe, expect, it } from "vitest";
import type { ScoutReport, SearchResponse, SearchSpec } from "../shared/types.ts";
import { parseQuery, templateReport } from "./ai/offline.ts";
import { checkClaims } from "./ai/types.ts";
import { app } from "./app.ts";
import { findByName, percentileOf, PROFILES } from "./players.ts";
import { checkSpec } from "./queryEval.ts";
import { MIN_MINUTES, search, similarity } from "./search.ts";

const EMPTY: SearchSpec = {
  positions: [], min_age: null, max_age: null, foot: "any", max_value_m: null, min_height_cm: null,
  leagues: [], nationalities: [], priorities: [], similar_to: null, max_value_ratio: null, explanation: "",
};
const star = [...PROFILES].filter((p) => p.position === "ST").sort((a, b) => b.market_value_m - a.market_value_m)[0]!;

describe("percentiles", () => {
  it("uses mid-rank for ties", () => {
    expect(percentileOf([1, 2, 3, 4], 4)).toBe(88);
    expect(percentileOf([1, 2, 2, 4], 2)).toBe(50);
  });

  it("compares players only with their own position", () => {
    const topScoringCb = PROFILES.filter((p) => p.position === "CB").sort((a, b) => b.metrics.goals - a.metrics.goals)[0]!;
    expect(topScoringCb.percentiles.goals).toBeGreaterThan(95);
  });
});

describe("search", () => {
  it("applies every hard filter", () => {
    const spec: SearchSpec = { ...EMPTY, positions: ["CB"], foot: "left", max_age: 24, max_value_m: 30 };
    const { matches } = search(spec);
    expect(matches.length).toBeGreaterThan(0);
    for (const { player } of matches) {
      expect(player).toMatchObject({ position: "CB" });
      expect(["left", "both"]).toContain(player.foot);
      expect(player.age).toBeLessThanOrEqual(24);
      expect(player.market_value_m).toBeLessThanOrEqual(30);
      expect(player.minutes).toBeGreaterThanOrEqual(MIN_MINUTES);
    }
  });

  it("ranks by weighted percentile of the priorities", () => {
    const { matches } = search({ ...EMPTY, positions: ["W"], priorities: [{ metric: "dribbles", weight: 3 }] });
    const scores = matches.map((m) => m.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(matches[0]!.reasons[0]).toMatchObject({ metric: "dribbles", percentile: matches[0]!.score });
  });

  it("finds cheaper players with a similar profile, excluding the reference player", () => {
    const res = search({ ...EMPTY, similar_to: star.name, max_value_ratio: 0.6 });
    expect(res.target?.id).toBe(star.id);
    expect(res.matches.every((m) => m.player.id !== star.id && m.player.position === "ST")).toBe(true);
    expect(res.matches.every((m) => m.player.market_value_m <= star.market_value_m * 0.6)).toBe(true);
  });

  it("scores identical profiles as 100% similar", () => {
    expect(similarity(star, star)).toBe(100);
  });

  it("finds players by name without accents", () => {
    expect(findByName(star.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase())?.id).toBe(star.id);
  });
});

describe("offline parser", () => {
  it("reads a typical brief", () => {
    expect(parseQuery("Left-footed centre-back under 24, max £30m, good in the air")).toMatchObject({
      positions: ["CB"], foot: "left", max_age: 23, max_value_m: 30, priorities: [{ metric: "aerial_pct", weight: 2 }],
    });
  });

  it("resolves a reference player and a relative budget", () => {
    expect(parseQuery(`A cheaper replacement for ${star.name}`)).toMatchObject({ similar_to: star.name, max_value_ratio: 0.6 });
  });

  it("is scored field by field by the query eval", () => {
    const checks = checkSpec(parseQuery("Young Brazilian winger who beats his man 1v1"), {
      positions: ["W"], max_age: 23, nationalities: ["Brazil"], metrics_any: [["dribbles"]],
    });
    expect(checks.every((c) => c.pass)).toBe(true);
  });
});

describe("report guardrail", () => {
  it("flags strengths and weaknesses the data doesn't support", () => {
    const [best, worst] = [...Object.entries(star.percentiles)].sort((a, b) => b[1] - a[1]).filter((_, i, all) => i === 0 || i === all.length - 1);
    const report = {
      ...templateReport(star),
      strengths: [{ metric: best![0], point: "" }, { metric: worst![0], point: "" }],
      weaknesses: [],
    } as ScoutReport;
    expect(checkClaims(report, star).map((c) => c.supported)).toEqual([true, false]);
  });

  it("template reports pass their own checks", () => {
    for (const p of PROFILES.slice(0, 50)) expect(checkClaims(templateReport(p), p).every((c) => c.supported)).toBe(true);
  });
});

describe("API", () => {
  const post = (path: string, body: unknown) =>
    app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("interprets, searches and reports end to end (offline)", async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { spec, source } = await (await post("/api/interpret", { query: "creative number 10 under £20m" })).json();
    expect(source).toBe("offline");
    const results: SearchResponse = await (await post("/api/search", { spec })).json();
    expect(results.matches[0]?.player.position).toBe("AM");
    const report = await post(`/api/players/${results.matches[0]!.player.id}/report`, {});
    expect(report.status).toBe(200);
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("returns 404 for unknown players and 400 for bad input", async () => {
    expect((await app.request("/api/players/nope")).status).toBe(404);
    expect((await post("/api/interpret", { query: "" })).status).toBe(400);
  });
});

describe("football-manager ratings", () => {
  it("maps percentiles onto 1-20 attributes", async () => {
    const { attribute, band } = await import("../shared/attributes.ts");
    expect([0, 1, 5, 6, 50, 79, 80, 100].map(attribute)).toEqual([1, 1, 1, 2, 10, 16, 16, 20]);
    expect([3, 8, 13, 18].map(band)).toEqual(["poor", "fair", "good", "excellent"]);
  });

  it("gives potential at least the current ability, and more only to younger players", async () => {
    const { ability } = await import("../shared/attributes.ts");
    for (const p of PROFILES) {
      const a = ability(p);
      expect(a.potential).toBeGreaterThanOrEqual(a.current);
      expect(a.potential).toBeLessThanOrEqual(5);
      if (p.age >= 27) expect(a.potential).toBe(a.current);
    }
  });
});

describe("assistant (offline)", () => {
  it("answers a brief with a shortlist from the real search", async () => {
    const { askOffline } = await import("./ai/assistant.ts");
    const res = askOffline([{ role: "user", content: "left-footed centre-back under 24" }]);
    expect(res.source).toBe("offline");
    expect(res.shortlist?.matches.length).toBeGreaterThan(0);
    expect(res.shortlist?.matches.every((m) => m.player.position === "CB")).toBe(true);
    expect(res.focusId).toBe(res.shortlist?.matches[0]?.player.id);
  });

  it("validates assistant requests", async () => {
    const res = await app.request("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(400);
  });
});
