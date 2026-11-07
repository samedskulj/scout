import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is optional: with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env the app requires
 * sign-in; without them it opens straight into the workspace, as it did before login existed.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const authEnabled = supabase !== null;

/** The signed-in user's access token, for API calls. */
export async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
