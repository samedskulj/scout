import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * When Supabase is configured (the same NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY the browser uses),
 * every API route except the public ones needs a valid signed-in session. Without them the API stays open,
 * which is how local demos and tests run.
 */
let client: SupabaseClient | null | undefined;

function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

export const authRequired = (): boolean => supabase() !== null;

const PUBLIC_PATHS = new Set(["/api/health", "/api/meta", "/api/demo"]);

export const requireUser: MiddlewareHandler = async (c, next) => {
  const sb = supabase();
  if (!sb || PUBLIC_PATHS.has(c.req.path)) return next();

  const token = c.req.header("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HTTPException(401, { message: "Sign in to use Scout Copilot." });

  // getClaims verifies the JWT signature (locally with asymmetric keys, via the Auth server otherwise).
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims.sub) throw new HTTPException(401, { message: "Your session has expired. Sign in again." });
  c.set("userId" as never, data.claims.sub as never);
  return next();
};
