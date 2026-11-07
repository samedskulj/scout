import { AlertTriangle, Check, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ability, ATTRIBUTE_GROUPS, attribute } from "../../shared/attributes.ts";
import { money, ordinal } from "../../shared/format.ts";
import {
  METRICS,
  POSITIONS,
  type AiSource,
  type Match,
  type MetricId,
  type PlayerDetail,
  type PlayerProfile,
  type ReportResponse,
} from "../../shared/types.ts";
import { apiGet, apiPost, Badge, Button, ErrorNote, Segmented, useAction, type ApiError } from "../ui/index.ts";
import { Pitch } from "./Pitch.tsx";
import { Radar } from "./Radar.tsx";
import { Attr, Stars } from "./Ratings.tsx";

type Tab = "attributes" | "compare" | "report";
const TABS = [
  { value: "attributes" as const, label: "Attributes" },
  { value: "compare" as const, label: "Compare" },
  { value: "report" as const, label: "Report" },
];

const FOOT = { left: "Left", right: "Right", both: "Either" } as const;
const ORDERED_METRICS: MetricId[] = ATTRIBUTE_GROUPS.flatMap((g) => g.metrics);

export function PlayerPanel({
  playerId,
  brief,
  engine,
  onSelect,
  onEngineFallback,
}: {
  playerId: string;
  brief: string | null;
  engine?: AiSource;
  onSelect: (id: string) => void;
  onEngineFallback: () => void;
}) {
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<Tab>("attributes");

  useEffect(() => {
    let cancelled = false;
    apiGet<PlayerDetail>(`/api/players/${playerId}`).then(
      (d) => !cancelled && setDetail(d),
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (error) return <ErrorNote message={error} />;
  if (!detail) return <PanelSkeleton />;
  const p = detail.player;
  const a = ability(p);

  return (
    <article className="profile" aria-label={`${p.name} profile`}>
      <header className="profile-head">
        <div className="profile-id">
          <h2 className="profile-name">{p.name}</h2>
          <p className="profile-club">
            {p.club} · {p.league}
          </p>
          <dl className="profile-facts">
            <div>
              <dt>Position</dt>
              <dd>{POSITIONS[p.position]}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{p.age}</dd>
            </div>
            <div>
              <dt>Nation</dt>
              <dd>{p.nationality}</dd>
            </div>
            <div>
              <dt>Foot</dt>
              <dd>{FOOT[p.foot]}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>{p.height_cm} cm</dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{money(p.market_value_m)}</dd>
            </div>
            <div>
              <dt>Contract</dt>
              <dd>{p.contract_until}</dd>
            </div>
            <div>
              <dt>Minutes</dt>
              <dd>{p.minutes.toLocaleString("en-GB")}</dd>
            </div>
          </dl>
        </div>
        <div className="profile-side">
          <div className="pitch-mini">
            <Pitch searched={[p.position]} selected={p.position} />
          </div>
          <div className="ability-block">
            <span className="mini-head">Ability</span>
            <Stars current={a.current} size="lg" />
            <span className="mini-head">Potential (estimate)</span>
            <Stars current={a.current} potential={a.potential} size="lg" />
          </div>
        </div>
      </header>

      <Segmented options={TABS} value={tab} onChange={setTab} label="Profile view" />

      {tab === "attributes" && <AttributeSheet player={p} keyScore={a.keyScore} />}
      {tab === "compare" && <Compare player={p} similar={detail.similar} onSelect={onSelect} />}
      {tab === "report" && <Report player={p} brief={brief} engine={engine} onEngineFallback={onEngineFallback} />}
    </article>
  );
}

function PanelSkeleton() {
  return (
    <div className="profile skeleton" aria-busy="true" aria-label="Loading player">
      <i style={{ width: "60%", height: 26 }} />
      <i style={{ width: "40%" }} />
      <i style={{ height: 120 }} />
      <i style={{ height: 260 }} />
    </div>
  );
}

function AttributeSheet({ player, keyScore }: { player: PlayerProfile; keyScore: number }) {
  return (
    <div className="sheet-wrap">
      <div className="sheet">
        {ATTRIBUTE_GROUPS.map((g) => (
          <section key={g.label} className="sheet-group">
            <h3 className="mini-head">{g.label}</h3>
            <ul>
              {g.metrics.map((m) => (
                <li key={m}>
                  <span className="sheet-label" title={METRICS[m].label}>
                    {METRICS[m].short}
                  </span>
                  <span className="sheet-raw">
                    {player.metrics[m]}
                    {METRICS[m].unit} · <span className="pct">{ordinal(player.percentiles[m])}</span>
                  </span>
                  <Attr percentile={player.percentiles[m]} metric={m} player={player} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="sheet-note small muted">
        Each attribute is the stat's percentile against other {POSITIONS[player.position].toLowerCase()}s, out of 20 (16+ excellent, 11–15
        good, 6–10 fair). Ability stars average the {ordinal(keyScore)} percentile across this position's key metrics. Potential adds headroom
        for age and is only an estimate.
      </p>
    </div>
  );
}

function Compare({ player, similar, onSelect }: { player: PlayerProfile; similar: Match[]; onSelect: (id: string) => void }) {
  const [cheaperOnly, setCheaperOnly] = useState(false);
  const options = useMemo(
    () => (cheaperOnly ? similar.filter((m) => m.player.market_value_m < player.market_value_m) : similar),
    [similar, cheaperOnly, player.market_value_m],
  );
  const [otherId, setOtherId] = useState<string | null>(similar[0]?.player.id ?? null);
  const other = options.find((m) => m.player.id === otherId) ?? options[0];

  return (
    <div className="compare">
      <div className="row spread">
        <h3 className="mini-head">Most similar profiles</h3>
        <label className="toggle small">
          <input type="checkbox" checked={cheaperOnly} onChange={(e) => setCheaperOnly(e.target.checked)} />
          Cheaper only
        </label>
      </div>
      {options.length ? (
        <ul className="similar-list">
          {options.map((m) => (
            <li key={m.player.id}>
              <button className={`similar${m.player.id === other?.player.id ? " active" : ""}`} onClick={() => setOtherId(m.player.id)}>
                <span className="similar-name">{m.player.name}</span>
                <span className="similar-meta">
                  {m.player.age} · {money(m.player.market_value_m)}
                </span>
                <span className="similar-score">{m.score}% alike</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="faint small">No similar {POSITIONS[player.position].toLowerCase()} is cheaper than {player.name}.</p>
      )}

      {other && (
        <>
          <Radar
            axes={ORDERED_METRICS.map((m) => METRICS[m].short)}
            series={[
              { name: player.name, values: ORDERED_METRICS.map((m) => player.percentiles[m]) },
              { name: other.player.name, values: ORDERED_METRICS.map((m) => other.player.percentiles[m]) },
            ]}
          />
          <table className="compare-table">
            <caption className="sr-only">
              {player.name} and {other.player.name}, attribute by attribute
            </caption>
            <thead>
              <tr>
                <th>Attribute</th>
                <th className="num">{player.name.split(" ").at(-1)}</th>
                <th className="num">{other.player.name.split(" ").at(-1)}</th>
              </tr>
            </thead>
            <tbody>
              {ORDERED_METRICS.map((m) => {
                const diff = attribute(player.percentiles[m]) - attribute(other.player.percentiles[m]);
                return (
                  <tr key={m}>
                    <td>{METRICS[m].short}</td>
                    <td className={`num${diff > 0 ? " leads" : ""}`}>
                      <Attr percentile={player.percentiles[m]} metric={m} player={player} />
                      <span className="pct">{ordinal(player.percentiles[m])} pct</span>
                    </td>
                    <td className={`num${diff < 0 ? " leads" : ""}`}>
                      <Attr percentile={other.player.percentiles[m]} metric={m} player={other.player} />
                      <span className="pct">{ordinal(other.player.percentiles[m])} pct</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button variant="secondary" onClick={() => onSelect(other.player.id)}>
            Open {other.player.name}
          </Button>
        </>
      )}
    </div>
  );
}

const RECOMMENDATION = { sign: { tone: "good", label: "Sign" }, monitor: { tone: "warn", label: "Monitor" }, pass: { tone: "bad", label: "Pass" } } as const;

function Report({
  player,
  brief,
  engine,
  onEngineFallback,
}: {
  player: PlayerProfile;
  brief: string | null;
  engine?: AiSource;
  onEngineFallback: () => void;
}) {
  const fetchReport = useCallback(
    () => apiPost<ReportResponse>(`/api/players/${player.id}/report`, { context: brief ?? undefined, engine }),
    [player.id, brief, engine],
  );
  const { data, error, loading, run } = useAction(fetchReport);

  if (!data)
    return (
      <div className="report-empty">
        <FileText aria-hidden />
        <p>
          A written report on {player.name}
          {brief ? " judged against your brief" : ""}. Every strength and weakness is checked against his percentiles.
        </p>
        <Button onClick={() => run()} loading={loading}>
          {loading ? "Writing report" : "Write scouting report"}
        </Button>
        <EngineError error={error} onFallback={onEngineFallback} />
      </div>
    );

  const { report, checks, source } = data;
  const rec = RECOMMENDATION[report.recommendation];
  const check = (kind: "strength" | "weakness", metric: MetricId) => checks.find((c) => c.kind === kind && c.metric === metric);
  const flagged = checks.filter((c) => !c.supported).length;

  return (
    <div className="report">
      <div className="row spread">
        <div className="row">
          <Badge tone={rec.tone}>{rec.label}</Badge>
          <Badge tone="neutral">Confidence: {report.confidence}</Badge>
        </div>
        <Badge tone={flagged ? "bad" : "good"}>
          {flagged ? <AlertTriangle aria-hidden /> : <Check aria-hidden />}
          {flagged ? `${flagged} claim${flagged > 1 ? "s" : ""} not backed by data` : "All claims checked"}
        </Badge>
      </div>
      <h3 className="report-headline">{report.headline}</h3>
      <p>{report.summary}</p>

      <div className="report-cols">
        {(["strength", "weakness"] as const).map((kind) => (
          <section key={kind}>
            <h4 className="mini-head">{kind === "strength" ? "Strengths" : "Weaknesses"}</h4>
            <ul className="claims">
              {(kind === "strength" ? report.strengths : report.weaknesses).map((s) => {
                const c = check(kind, s.metric);
                return (
                  <li key={s.metric} className={c?.supported === false ? "unsupported" : ""}>
                    <span className="claim-head">
                      <Attr percentile={player.percentiles[s.metric]} metric={s.metric} player={player} />
                      <strong>{METRICS[s.metric].short}</strong>
                      {c?.supported === false && (
                        <span className="flag">
                          <AlertTriangle aria-hidden /> {ordinal(c.percentile)} pct: not a {kind}
                        </span>
                      )}
                    </span>
                    <span>{s.point}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section>
        <h4 className="mini-head">Best role</h4>
        <p>{report.best_role}</p>
      </section>
      {report.risks.length > 0 && (
        <section>
          <h4 className="mini-head">Risks</h4>
          <ul className="risks">
            {report.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="faint small">{source === "claude" ? "Written by Claude, checked by code." : "Template report (offline mode), checked by code."}</p>
    </div>
  );
}

export function EngineError({ error, onFallback }: { error?: ApiError; onFallback: () => void }) {
  if (!error) return null;
  return (
    <div className="engine-error" role="alert">
      <p>{error.message}</p>
      {error.code === "claude_unavailable" && (
        <Button variant="secondary" onClick={onFallback}>
          Switch to keyword engine
        </Button>
      )}
    </div>
  );
}
