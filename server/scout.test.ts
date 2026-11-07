import { describe, expect, it } from "vitest";
import type { PlayerProfile, ScoutReport } from "../shared/types.ts";
import { checkClaims, playerId } from "./ai/live.ts";
import { app } from "./app.ts";

const profile: PlayerProfile = {
  id: "x", name: "Test Player", age: 22, birth_date: "2003-01-02", nationality: "England", position: "W", role: "Right winger",
  foot: "left", height_cm: 178, club: "Test FC", league: "Premier League", market_value_eur_m: 40, contract_until: "Jun 2028",
  season: "2025/26", appearances: 20, minutes: 1600, goals: 7, assists: 5,
  key_stats: [{ label: "xG per 90", value: "0.38" }, { label: "Successful dribbles per 90", value: "2.9" }],
  fit: 80, fit_reason: "", sources: [{ title: "Transfermarkt", url: "https://www.transfermarkt.com/x" }],
  photo: null, cutout: null, clubBadge: null,
  season_stats: [{ label: "Aerial duels won %", value: "31%" }], career: [], profile: "", recent_news: [],
};

const report = (strengths: string[], weaknesses: string[]): ScoutReport => ({
  headline: "", summary: "", best_role: "", risks: [], recommendation: "monitor", confidence: "low",
  strengths: strengths.map((stat) => ({ stat, point: "" })),
  weaknesses: weaknesses.map((stat) => ({ stat, point: "" })),
});

describe("report guardrail", () => {
  it("accepts claims tied to stats in the profile, in any case", () => {
    const checks = checkClaims(report(["xG per 90", "goals"], ["Aerial duels won %"]), profile);
    expect(checks.map((c) => [c.supported, c.value])).toEqual([[true, "0.38"], [true, "7"], [true, "31%"]]);
  });

  it("flags claims that name a stat the profile doesn't have", () => {
    const [check] = checkClaims(report(["Tackles per 90"], []), profile);
    expect(check).toMatchObject({ kind: "strength", supported: false, value: null });
  });
});

describe("player ids", () => {
  it("are stable across accents and punctuation", () => {
    expect(playerId({ name: "Álvaro Núñez", birth_date: "2001-05-03", club: null })).toBe("alvaro-nunez-2001-05-03");
    expect(playerId({ name: "Jan O'Brien", birth_date: null, club: "FC Twente" })).toBe("jan-o-brien-fc-twente");
  });
});

describe("API", () => {
  const post = (path: string, body: unknown) =>
    app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("validates input before doing any work", async () => {
    expect((await post("/api/scout", { query: "" })).status).toBe(400);
    expect((await post("/api/profile", { name: "" })).status).toBe(400);
    expect((await post("/api/assistant", { messages: [] })).status).toBe(400);
    expect((await post("/api/report", { profile: { name: "x" } })).status).toBe(400);
  });

  it("answers 503 on every AI route when no key is configured", async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect((await post("/api/scout", { query: "left-footed centre-back" })).status).toBe(503);
      expect((await post("/api/profile", { name: "Bukayo Saka" })).status).toBe(503);
      expect((await post("/api/assistant", { messages: [{ role: "user", content: "hi" }] })).status).toBe(503);
    } finally {
      if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
    }
  });

  it("serves example briefs", async () => {
    const meta = (await (await app.request("/api/meta")).json()) as { examples: string[] };
    expect(meta.examples.length).toBeGreaterThan(2);
  });
});
