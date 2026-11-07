// Types shared by server and browser. Keep this file free of Node imports.

export interface Health {
  /** True when a Claude API key is configured. */
  live: boolean;
  model: string;
}

export interface ApiErrorBody {
  error: string;
  /** "claude_unavailable" means the rule-based engine can still do the job. */
  code?: "claude_unavailable";
}
