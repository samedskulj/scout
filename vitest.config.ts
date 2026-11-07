import { defineConfig } from "vitest/config";

// Tests never use the real Supabase project from .env: the API runs open unless a test turns auth on itself.
export default defineConfig({
  test: {
    include: ["{server,shared,src}/**/*.test.{ts,tsx}"],
    environment: "node",
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
  },
});
