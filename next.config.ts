import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The JSON player database is read from disk by the API route; make sure it ships with the server build.
  outputFileTracingIncludes: { "/api/**": ["./data/**/*.json"] },
};

export default nextConfig;
