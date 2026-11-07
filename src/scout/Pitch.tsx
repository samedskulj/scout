import { POSITIONS, type Position } from "../../shared/types.ts";

/** Counter spots on a half pitch, attacking upwards. Positions with two spots light both. */
const SPOTS: Record<Position, [number, number][]> = {
  ST: [[150, 58]],
  W: [[52, 92], [248, 92]],
  AM: [[150, 118]],
  CM: [[100, 168], [200, 168]],
  DM: [[150, 210]],
  FB: [[42, 252], [258, 252]],
  CB: [[112, 280], [188, 280]],
  GK: [[150, 312]],
};

/**
 * The signature move: the brief drawn on a pitch. Searched positions glow as chalk counters;
 * the selected player's position carries the yellow counter. Click a position to toggle it.
 */
export function Pitch({
  searched,
  selected,
  onToggle,
}: {
  searched: Position[];
  selected?: Position;
  onToggle?: (p: Position) => void;
}) {
  const anySearched = searched.length > 0;
  return (
    <svg className="pitch" viewBox="0 0 300 330" role="group" aria-label="Positions in this search">
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="0" y={i * 55} width="300" height="55" className={i % 2 ? "turf-b" : "turf-a"} />
      ))}
      <g className="chalk">
        <rect x="8" y="8" width="284" height="314" />
        <rect x="70" y="8" width="160" height="70" />
        <rect x="115" y="8" width="70" height="26" />
        <path d="M120 78 A 34 34 0 0 0 180 78" />
        <path d="M100 322 A 50 50 0 0 1 200 322" />
        <circle cx="150" cy="56" r="1.8" className="chalk-dot" />
      </g>
      {(Object.entries(SPOTS) as [Position, [number, number][]][]).map(([pos, spots]) => {
        const lit = searched.includes(pos);
        const isSelected = selected === pos;
        return (
          <g
            key={pos}
            className={`spot${lit ? " is-lit" : ""}${!anySearched ? " is-open" : ""}${isSelected ? " is-selected" : ""}`}
            role="button"
            tabIndex={onToggle ? 0 : -1}
            aria-pressed={lit}
            aria-label={`${POSITIONS[pos]}${lit ? ", in search" : ""}`}
            onClick={() => onToggle?.(pos)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.(pos);
              }
            }}
          >
            {spots.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="17" className="counter" />
                <text x={x} y={y} className="counter-label">
                  {pos}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
