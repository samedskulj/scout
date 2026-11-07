import { X } from "lucide-react";
import { money } from "../../shared/format.ts";
import { METRICS, POSITIONS, type Interpretation, type Position, type SearchSpec } from "../../shared/types.ts";
import { Pitch } from "./Pitch.tsx";

interface Chip {
  key: string;
  label: string;
  clear: (s: SearchSpec) => SearchSpec;
}

function filterChips(s: SearchSpec): Chip[] {
  const chips: Chip[] = [];
  if (s.foot !== "any") chips.push({ key: "foot", label: `${s.foot === "left" ? "Left" : "Right"} foot`, clear: (x) => ({ ...x, foot: "any" }) });
  if (s.min_age !== null) chips.push({ key: "min_age", label: `Age ${s.min_age}+`, clear: (x) => ({ ...x, min_age: null }) });
  if (s.max_age !== null) chips.push({ key: "max_age", label: `Age ≤ ${s.max_age}`, clear: (x) => ({ ...x, max_age: null }) });
  if (s.max_value_m !== null) chips.push({ key: "value", label: `Value ≤ ${money(s.max_value_m)}`, clear: (x) => ({ ...x, max_value_m: null }) });
  if (s.min_height_cm !== null) chips.push({ key: "height", label: `${s.min_height_cm} cm+`, clear: (x) => ({ ...x, min_height_cm: null }) });
  for (const l of s.leagues) chips.push({ key: `league-${l}`, label: l, clear: (x) => ({ ...x, leagues: x.leagues.filter((v) => v !== l) }) });
  for (const n of s.nationalities)
    chips.push({ key: `nat-${n}`, label: n, clear: (x) => ({ ...x, nationalities: x.nationalities.filter((v) => v !== n) }) });
  if (s.similar_to)
    chips.push({
      key: "similar",
      label: `Like ${s.similar_to}${s.max_value_ratio ? ` · ≤ ${Math.round(s.max_value_ratio * 100)}% of his value` : ""}`,
      clear: (x) => ({ ...x, similar_to: null, max_value_ratio: null }),
    });
  return chips;
}

const WEIGHT_LABEL = ["", "Nice to have", "Important", "Essential"];

export function BriefRead({
  interpretation,
  selectedPosition,
  busy,
  scopesBoard,
  onShowBrief,
  onChange,
}: {
  interpretation: Interpretation | null;
  selectedPosition?: Position;
  busy: boolean;
  /** False while the board shows the assistant's picks, which these filters don't scope. */
  scopesBoard: boolean;
  onShowBrief: () => void;
  onChange: (spec: SearchSpec) => void;
}) {
  const spec = interpretation?.spec;
  const togglePosition = (p: Position) =>
    spec && onChange({ ...spec, positions: spec.positions.includes(p) ? spec.positions.filter((x) => x !== p) : [...spec.positions, p] });
  const chips = spec ? filterChips(spec) : [];

  return (
    <section className={`pane-section read${spec && !scopesBoard ? " is-parked" : ""}`} aria-busy={busy}>
      <header className="section-head">
        <h2>{interpretation?.source === "offline" ? "Keyword read of the brief" : "How Claude read the brief"}</h2>
      </header>

      {spec && !scopesBoard && (
        <div className="parked-note small">
          <p>The board shows the assistant's picks. These filters apply to your brief results.</p>
          <button className="link-btn" onClick={onShowBrief}>
            Show brief results
          </button>
        </div>
      )}

      {spec ? <p className="read-explanation">{spec.explanation}</p> : <p className="muted small">Write a brief above. The positions, filters and priorities it turns into appear here, and you can change them.</p>}

      <div className="read-grid">
        <Pitch searched={spec?.positions ?? []} selected={selectedPosition} onToggle={spec ? togglePosition : undefined} />
        <div className="read-legend small">
          {spec ? (
            <>
              <p className="read-positions">{spec.positions.length ? spec.positions.map((p) => POSITIONS[p]).join(", ") : "Any position"}</p>
              <ul className="pitch-key">
                <li>
                  <i className="key-searched" aria-hidden /> Searched
                </li>
                <li>
                  <i className="key-selected" aria-hidden /> Open player
                </li>
              </ul>
              <p className="faint">Click a position to toggle it.</p>
            </>
          ) : (
            <p className="muted">Positions light up when a brief names them.</p>
          )}
        </div>
      </div>

      {spec && (
        <>
          <div className="chip-block">
            <h3 className="mini-head">Filters</h3>
            {chips.length ? (
              <ul className="chips">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button className="chip" onClick={() => onChange(c.clear(spec))} aria-label={`Remove filter ${c.label}`}>
                      {c.label}
                      <X aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="faint small">No filters beyond position.</p>
            )}
          </div>

          <div className="chip-block">
            <h3 className="mini-head">What matters most</h3>
            {spec.priorities.length ? (
              <ul className="priorities">
                {spec.priorities.map((p, i) => (
                  <li key={p.metric}>
                    <button
                      className="priority"
                      title="Click to change how much this counts"
                      onClick={() =>
                        onChange({
                          ...spec,
                          priorities: spec.priorities.map((q, j) => (j === i ? { ...q, weight: (q.weight % 3) + 1 } : q)),
                        })
                      }
                    >
                      <span>{METRICS[p.metric].label}</span>
                      <span className="weight" aria-label={WEIGHT_LABEL[Math.round(p.weight)]}>
                        {[1, 2, 3].map((w) => (
                          <i key={w} className={w <= Math.round(p.weight) ? "on" : ""} />
                        ))}
                      </span>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Remove priority ${METRICS[p.metric].label}`}
                      onClick={() => onChange({ ...spec, priorities: spec.priorities.filter((_, j) => j !== i) })}
                    >
                      <X aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="faint small">No style named, so each position's key metrics decide the ranking.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
