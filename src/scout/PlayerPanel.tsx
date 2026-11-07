import { AlertTriangle, Check, FileText, RefreshCw, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { dash, eur } from "../../shared/format.ts";
import { POSITIONS, type PlayerProfile, type ReportResponse, type ScoutPlayer } from "../../shared/types.ts";
import { apiPost, apiStream, asApiError, Badge, Button, Segmented, useAction, type ApiError } from "../ui/index.ts";
import { Avatar, ClubBadge, FitScore, SearchLog, SourceList } from "./bits.tsx";
import type { Favourites } from "./favourites.ts";
import { Pitch } from "./Pitch.tsx";

type Tab = "stats" | "report" | "sources";
const TABS = [
  { value: "stats" as const, label: "Stats" },
  { value: "report" as const, label: "Report" },
  { value: "sources" as const, label: "Sources" },
];

const FOOT = { left: "Left", right: "Right", both: "Either", unknown: "–" } as const;

/** Load the full live profile for a player found in a search. */
function useProfile(player: ScoutPlayer) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<ApiError>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Aborting tells the server to stop researching, so switching players doesn't pay for the one you left.
    const abort = new AbortController();
    apiStream<PlayerProfile>("/api/profile", { name: player.name, club: player.club }, (l) => setLines((x) => [...x, l]), abort.signal).then(
      (p) => !abort.signal.aborted && setProfile(p),
      (e) => !abort.signal.aborted && setError(asApiError(e)),
    );
    return () => abort.abort();
  }, [player.name, player.club, attempt]);

  const retry = () => {
    setError(undefined);
    setLines([]);
    setAttempt((n) => n + 1);
  };
  return { profile, lines, error, loading: !profile && !error, retry };
}

export function PlayerPanel({ player, brief, favourites }: { player: ScoutPlayer; brief: string | null; favourites: Favourites }) {
  const [tab, setTab] = useState<Tab>("stats");
  const { profile, lines, error, loading, retry } = useProfile(player);
  // The search result shows straight away; the full profile fills in when its own search finishes.
  const p: ScoutPlayer = profile ? { ...player, ...profile, fit: player.fit, fit_reason: player.fit_reason } : player;

  return (
    <article className="profile" aria-label={`${p.name} profile`}>
      <header className="profile-head">
        <div className="profile-id">
          <div className="profile-title">
            <Avatar player={p} size={64} prefer="cutout" className="profile-photo" />
            <div>
              <h2 className="profile-name">{p.name}</h2>
              <p className="profile-club">
                <ClubBadge src={p.clubBadge} size={16} /> {[p.club, p.league].filter(Boolean).join(" · ") || "Club unknown"}
              </p>
              <FavouriteButton player={player} favourites={favourites} />
            </div>
          </div>
          <dl className="profile-facts">
            <div>
              <dt>Position</dt>
              <dd title={p.role}>{p.role || POSITIONS[p.position]}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{dash(p.age)}</dd>
            </div>
            <div>
              <dt>Nation</dt>
              <dd>{dash(p.nationality)}</dd>
            </div>
            <div>
              <dt>Foot</dt>
              <dd>{FOOT[p.foot]}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>{p.height_cm ? `${p.height_cm} cm` : "–"}</dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{eur(p.market_value_eur_m)}</dd>
            </div>
            <div>
              <dt>Contract</dt>
              <dd>{dash(p.contract_until)}</dd>
            </div>
            <div>
              <dt>{p.season} apps</dt>
              <dd>{dash(p.appearances)}</dd>
            </div>
            <div>
              <dt>Goals · assists</dt>
              <dd>
                {dash(p.goals)} · {dash(p.assists)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="profile-side">
          <div className="pitch-mini">
            <Pitch searched={[p.position]} selected={p.position} />
          </div>
          <div className="fit-block">
            <span className="mini-head">Fit to brief</span>
            <FitScore fit={player.fit} />
          </div>
        </div>
      </header>

      <p className="fit-reason">{player.fit_reason}</p>

      <Segmented options={TABS} value={tab} onChange={setTab} label="Profile view" />

      {tab === "stats" && <StatsTab player={p} profile={profile} lines={lines} loading={loading} error={error} onRetry={retry} />}
      {tab === "report" && <Report player={p} profile={profile} brief={brief} loading={loading} />}
      {tab === "sources" && (
        <div className="sources-tab">
          <SourceList sources={profile?.sources ?? player.sources} />
          <p className="faint small">Facts come from these pages via live web search. Photos and badges: TheSportsDB.</p>
        </div>
      )}
    </article>
  );
}

function StatsTab({
  player,
  profile,
  lines,
  loading,
  error,
  onRetry,
}: {
  player: ScoutPlayer;
  profile: PlayerProfile | null;
  lines: string[];
  loading: boolean;
  error?: ApiError;
  onRetry: () => void;
}) {
  const stats = profile?.season_stats.length ? profile.season_stats : player.key_stats;
  return (
    <div className="stats-tab">
      {profile?.profile && <p className="profile-blurb">{profile.profile}</p>}

      <section>
        <h3 className="mini-head">
          {player.season} stats{profile ? "" : " (from the search)"}
        </h3>
        {stats.length ? (
          <ul className="stat-list">
            {stats.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <b>{s.value}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="faint small">No stats found for this season.</p>
        )}
      </section>

      {loading && <SearchLog lines={lines} title={`Researching ${player.name}`} />}
      {error && <ApiErrorNote error={error} onRetry={onRetry} />}

      {profile && profile.career.length > 0 && (
        <section>
          <h3 className="mini-head">Recent seasons</h3>
          <table className="career-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Club</th>
                <th className="num">Apps</th>
                <th className="num">Goals</th>
              </tr>
            </thead>
            <tbody>
              {profile.career.map((c) => (
                <tr key={`${c.season}-${c.club}`}>
                  <td>{c.season}</td>
                  <td>{c.club}</td>
                  <td className="num">{dash(c.appearances)}</td>
                  <td className="num">{dash(c.goals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {profile && profile.recent_news.length > 0 && (
        <section>
          <h3 className="mini-head">Recent news</h3>
          <ul className="risks">
            {profile.recent_news.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const RECOMMENDATION = { sign: { tone: "good", label: "Sign" }, monitor: { tone: "warn", label: "Monitor" }, pass: { tone: "bad", label: "Pass" } } as const;

function Report({ player, profile, brief, loading }: { player: ScoutPlayer; profile: PlayerProfile | null; brief: string | null; loading: boolean }) {
  const fetchReport = useCallback(() => apiPost<ReportResponse>("/api/report", { profile, brief }), [profile, brief]);
  const { data, error, loading: writing, run } = useAction(fetchReport);

  if (!data)
    return (
      <div className="report-empty">
        <FileText aria-hidden />
        <p>
          A written report on {player.name}
          {brief ? " judged against your brief" : ""}. Every strength and weakness must point to a stat in his profile; anything that doesn't is
          flagged.
        </p>
        <Button onClick={() => run()} loading={writing} disabled={!profile}>
          {writing ? "Writing report" : loading ? "Waiting for his profile" : "Write scouting report"}
        </Button>
        <ApiErrorNote error={error} onRetry={() => run()} />
      </div>
    );

  const { report, checks } = data;
  const rec = RECOMMENDATION[report.recommendation];
  const check = (kind: "strength" | "weakness", stat: string) => checks.find((c) => c.kind === kind && c.stat === stat);
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
          {flagged ? `${flagged} claim${flagged > 1 ? "s" : ""} not backed by his stats` : "All claims checked"}
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
                const c = check(kind, s.stat);
                return (
                  <li key={s.stat} className={c?.supported === false ? "unsupported" : ""}>
                    <span className="claim-head">
                      <strong>{s.stat}</strong>
                      {c?.value && <span className="claim-value">{c.value}</span>}
                      {c?.supported === false && (
                        <span className="flag">
                          <AlertTriangle aria-hidden /> not in his stats
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
      <div className="row">
        <p className="faint small">Written by AI from his live profile, checked by code.</p>
        <Button variant="ghost" onClick={() => run()} loading={writing}>
          <RefreshCw aria-hidden /> Rewrite
        </Button>
      </div>
    </div>
  );
}

export function ApiErrorNote({ error, onRetry }: { error?: ApiError; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="engine-error" role="alert">
      <p>{error.message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Star toggle: saves the player (as found) to the favourites board, or removes him. */
export function FavouriteButton({ player, favourites, compact = false }: { player: ScoutPlayer; favourites: Favourites; compact?: boolean }) {
  const on = favourites.has(player.id);
  return (
    <button
      type="button"
      className={`fav-btn${on ? " is-on" : ""}${compact ? " is-compact" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${player.name} from favourites` : `Add ${player.name} to favourites`}
      title={on ? "In your favourites" : "Add to favourites"}
      onClick={(e) => {
        e.stopPropagation();
        favourites.toggle(player);
      }}
    >
      <Star aria-hidden />
      {!compact && <span>{on ? "Favourite" : "Add to favourites"}</span>}
    </button>
  );
}
