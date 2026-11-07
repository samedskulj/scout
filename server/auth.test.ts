import type { Hono } from "hono";
import { beforeAll, describe, expect, it } from "vitest";

/** With Supabase configured, the API needs a session except on its public routes. No network call is made here. */
describe("API sign-in guard", () => {
  let app: Pick<Hono, "request">;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-publishable-key";
    ({ app } = await import("./app.ts"));
  });

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

  it("rejects protected routes without a session", async () => {
    const res = await post("/api/search", { spec: {} });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toMatch(/sign in/i);
  });

  it("keeps health, meta and the landing demo public", async () => {
    expect((await app.request("/api/health")).status).toBe(200);
    expect((await app.request("/api/meta")).status).toBe(200);
    const demo = await post("/api/demo", { query: "left-footed centre-back under 24" });
    expect(demo.status).toBe(200);
    const body = (await demo.json()) as { matches: { player: { position: string } }[] };
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches.length).toBeLessThanOrEqual(5);
    expect(body.matches.every((m) => m.player.position === "CB")).toBe(true);
  });
});
