import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { ability } from "../../shared/attributes.ts";
import { money } from "../../shared/format.ts";
import { KEY_METRICS, type Match, type MetricId, type Reason } from "../../shared/types.ts";
import { Attr, Stars } from "./Ratings.tsx";

type SortKey = "fit" | "age" | "value" | "ability";

/** Table-width labels; the full name is in each chip's title and the profile sheet. */
const ABBR: Record<MetricId, string> = {
  goals: "Goals",
  xg: "xG",
  shots: "Shots",
  xa: "xA",
  key_passes: "Key pass",
  prog_passes: "Prog pass",
  prog_carries: "Carries",
  dribbles: "Dribbles",
  pass_pct: "Pass %",
  tackles_int: "Tkl+Int",
  aerial_pct: "Aerial",
  recoveries: "Recov",
};

/** The search's own reasons, or the position's three strongest key metrics when the assistant picked the player. */
const driversFor = (m: Match): Reason[] =>
  m.reasons.length
    ? m.reasons
    : [...KEY_METRICS[m.player.position]]
        .sort((a, b) => m.player.percentiles[b] - m.player.percentiles[a])
        .slice(0, 3)
        .map((metric) => ({ metric, percentile: m.player.percentiles[metric] }));

export function Shortlist({
  matches,
  selectedId,
  scoreLabel,
  onSelect,
}: {
  matches: Match[];
  selectedId: string | null;
  scoreLabel: string;
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "fit", dir: -1 });

  const rows = useMemo(() => {
    const ranked = matches.map((m, i) => ({ m, rank: i + 1, ability: ability(m.player) }));
    const value = (r: (typeof ranked)[number]) =>
      sort.key === "fit" ? r.m.score : sort.key === "age" ? r.m.player.age : sort.key === "value" ? r.m.player.market_value_m : r.ability.current * 100 + r.ability.keyScore;
    return [...ranked].sort((a, b) => sort.dir * (value(a) - value(b)) || a.rank - b.rank);
  }, [matches, sort]);

  const header = (key: SortKey, label: string, className = "") => {
    const active = sort.key === key;
    return (
      <th className={className} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          className={`sort${active ? " active" : ""}`}
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "age" || key === "value" ? 1 : -1 }))}
        >
          {label}
          {active && (sort.dir === 1 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />)}
        </button>
      </th>
    );
  };

  return (
    <table className="shortlist">
      <thead>
        <tr>
          <th className="rank-col">
            <span className="sr-only">Rank</span>#
          </th>
          <th>Player</th>
          {header("age", "Age", "num")}
          {header("value", "Value", "num")}
          {header("ability", "Ability")}
          <th className="drivers-col">Why he ranks here</th>
          {header("fit", scoreLabel, "num")}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ m, rank, ability: a }, i) => {
          const p = m.player;
          const selected = p.id === selectedId;
          const drivers = driversFor(m);
          return (
            <tr
              key={p.id}
              className={selected ? "selected" : ""}
              style={{ "--i": Math.min(i, 12) } as CSSProperties}
              onClick={() => onSelect(p.id)}
            >
              <td className="rank-col">{rank}</td>
              <td className="player-cell">
                <button className="player-name" onClick={() => onSelect(p.id)} aria-pressed={selected}>
                  {p.name}
                </button>
                <span className="player-sub">
                  <span className="pos-code">{p.position}</span>
                  {p.club} · {p.league}
                </span>
                {/* Phones drop the drivers column, so the two strongest reasons ride under the name. */}
                <span className="drivers-inline">
                  {drivers.slice(0, 2).map((r) => (
                    <span className="driver" key={r.metric}>
                      <span className="driver-label">{ABBR[r.metric]}</span>
                      <Attr percentile={r.percentile} metric={r.metric} player={p} />
                    </span>
                  ))}
                </span>
              </td>
              <td className="num">{p.age}</td>
              <td className="num value-cell">{money(p.market_value_m)}</td>
              <td>
                <Stars current={a.current} potential={a.potential} />
              </td>
              <td className="drivers-col">
                <span className="drivers">
                  {drivers.map((r) => (
                    <span className="driver" key={r.metric}>
                      <span className="driver-label">{ABBR[r.metric]}</span>
                      <Attr percentile={r.percentile} metric={r.metric} player={p} />
                    </span>
                  ))}
                </span>
              </td>
              <td className="num fit-cell">
                <span className="fit-value">{m.score}</span>
                <span className="fit-bar" aria-hidden>
                  <i style={{ width: `${m.score}%` }} />
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
