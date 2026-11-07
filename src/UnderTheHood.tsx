import { Check, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { AiSource, QueryEvalReport } from "../shared/types.ts";
import { EngineError } from "./scout/PlayerPanel.tsx";
import { apiPost, Button, Segmented, useAction, useHealth } from "./ui/index.ts";

const STEPS = [
  {
    title: "Claude reads the brief",
    body: "Your words become a structured search: positions, age, foot, budget, leagues, a reference player, and the 2–5 metrics that describe the style you want, each weighted 1–3. It is shown on the left of the workspace, and every part can be removed or re-weighted.",
  },
  {
    title: "Code ranks the players",
    body: "Each metric is a percentile against players in the same position, so a centre-back's dribbling is compared with other centre-backs. The rank is the weighted mean of those percentiles. Players under 900 minutes are left out. There is no hidden score.",
  },
  {
    title: "Ratings come from the same numbers",
    body: "A 1–20 attribute is the percentile divided by 5, rounded up. Ability stars average the position's key metrics. Potential adds headroom for age (up to two stars at 20 or younger) and is labelled as an estimate everywhere.",
  },
  {
    title: "Claude writes; code checks",
    body: "Reports must tie every strength to a metric at or above the 60th percentile and every weakness to one at or below the 40th. Claims that fail are flagged on the report, not hidden. The assistant can only quote numbers it fetched with its database tools, and each lookup is listed in the chat.",
  },
];

export function UnderTheHood() {
  const health = useHealth();
  const [engine, setEngine] = useState<AiSource>("offline");
  const runEval = useCallback((e: AiSource) => apiPost<QueryEvalReport>("/api/eval", { engine: e }), []);
  const { data, error, loading, run } = useAction(runEval);

  return (
    <div className="hood">
      <section className="hood-method">
        <h2>How a shortlist is made</h2>
        <ol className="method">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="faint small">All 300 players and 25 clubs are fictional, generated with a fixed seed. Stats are not adjusted for league strength yet.</p>
      </section>

      <section className="hood-eval">
        <h2>Brief-reading test</h2>
        <p className="muted">
          Eight real-world briefs with the answers a scout would agree on. Run them through either engine and see which fields it reads correctly.
        </p>
        <div className="row">
          <Segmented
            label="Engine"
            value={engine}
            onChange={setEngine}
            options={[
              { value: "offline", label: "Keyword engine" },
              { value: "claude", label: "Claude", disabled: !health?.live, hint: health?.live ? undefined : "Needs an API key" },
            ]}
          />
          <Button onClick={() => run(engine)} loading={loading}>
            {loading ? "Running" : "Run test"}
          </Button>
        </div>
        <EngineError error={error} onFallback={() => setEngine("offline")} />
        {data && (
          <>
            <p className="eval-score">
              <span className="cond">
                {data.passed}/{data.total}
              </span>{" "}
              checks passed · {data.source === "claude" ? "Claude" : "keyword engine"}
            </p>
            <table className="eval-table">
              <thead>
                <tr>
                  <th>Brief</th>
                  <th>Fields checked</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.query}>
                    <td>{r.query}</td>
                    <td>
                      <span className="eval-checks">
                        {r.checks.map((c) => (
                          <span key={c.field} className={`eval-check ${c.pass ? "pass" : "fail"}`}>
                            {c.pass ? <Check aria-label="passed" /> : <X aria-label="failed" />}
                            {c.field.replace(/_/g, " ")}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
