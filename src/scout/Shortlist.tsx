import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { dash, eur } from "../../shared/format.ts";
import type { ScoutPlayer } from "../../shared/types.ts";
import { Avatar, ClubBadge, FitScore } from "./bits.tsx";
import type { Favourites } from "./favourites.ts";
import { FavouriteButton } from "./PlayerPanel.tsx";

type SortKey = "fit" | "age" | "value" | "goals";

const sortValue = (p: ScoutPlayer, key: SortKey): number | null =>
  key === "fit" ? p.fit : key === "age" ? p.age : key === "value" ? p.market_value_eur_m : p.goals;

/** Real players found for the brief. Unknown values sort last and show a dash. */
export function Shortlist({
  players,
  selectedId,
  onSelect,
  favourites,
}: {
  players: ScoutPlayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  favourites: Favourites;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "fit", dir: -1 });

  const rows = useMemo(() => {
    const ranked = players.map((p, i) => ({ p, rank: i + 1 }));
    return [...ranked].sort((a, b) => {
      const va = sortValue(a.p, sort.key);
      const vb = sortValue(b.p, sort.key);
      if (va === null && vb === null) return a.rank - b.rank;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.dir * (va - vb) || a.rank - b.rank;
    });
  }, [players, sort]);

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
          {header("goals", "Season", "num season-col")}
          <th className="why-col">Why he fits</th>
          {header("fit", "Fit", "num")}
          <th className="fav-col">
            <span className="sr-only">Favourite</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ p, rank }, i) => {
          const selected = p.id === selectedId;
          return (
            <tr key={p.id} className={selected ? "selected" : ""} style={{ "--i": Math.min(i, 12) } as CSSProperties} onClick={() => onSelect(p.id)}>
              <td className="rank-col">{rank}</td>
              <td className="player-cell">
                <span className="player-id-cell">
                  <Avatar player={p} size={34} />
                  <span className="player-id-text">
                    <button className="player-name" onClick={() => onSelect(p.id)} aria-pressed={selected}>
                      {p.name}
                    </button>
                    <span className="player-sub">
                      <span className="pos-code">{p.position}</span>
                      <ClubBadge src={p.clubBadge} size={14} />
                      {[p.club, p.league].filter(Boolean).join(" · ") || "Club unknown"}
                    </span>
                  </span>
                </span>
              </td>
              <td className="num">{dash(p.age)}</td>
              <td className="num value-cell">{eur(p.market_value_eur_m)}</td>
              <td className="num season-col" title={`${p.season} league: appearances, goals, assists`}>
                <span className="season-line">
                  {dash(p.appearances)} <small>apps</small> {dash(p.goals)} <small>G</small> {dash(p.assists)} <small>A</small>
                </span>
              </td>
              <td className="why-col">
                <span className="why-text" title={p.fit_reason}>
                  {p.fit_reason}
                </span>
              </td>
              <td className="num fit-cell">
                <FitScore fit={p.fit} />
              </td>
              <td className="fav-col">
                <FavouriteButton player={p} favourites={favourites} compact />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
