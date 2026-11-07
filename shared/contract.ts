// Types shared by server and browser. Keep this file free of Node imports.

export interface Health {
  /** True when a Claude API key is configured. */
  live: boolean;
  model: string;
}

export interface ApiErrorBody {
  error: string;
  /** "claude_unavailable" means the Claude API call failed (credit, rate limit, outage); retrying may help. */
  code?: "claude_unavailable";
}
