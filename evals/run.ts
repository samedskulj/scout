// Scores natural-language query interpretation. Usage: npm run eval:scout
import { isLive, loadEnv } from "../server/lib/index.ts";
import { claudeAi } from "../server/ai/claude.ts";
import { offlineAi } from "../server/ai/offline.ts";
import { runQueryEval } from "../server/queryEval.ts";

loadEnv();
for (const ai of isLive() ? [offlineAi, claudeAi] : [offlineAi]) {
  const report = await runQueryEval(ai);
  console.log(`\n${ai.source.toUpperCase()}: ${report.passed}/${report.total} checks passed`);
  for (const r of report.results) {
    const failed = r.checks.filter((c) => !c.pass).map((c) => c.field);
    console.log(`${failed.length ? "✗" : "✓"} ${r.query}${failed.length ? `\n    failed: ${failed.join(", ")}` : ""}`);
  }
}
