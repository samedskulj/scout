import { POSITIONS, type BriefRead as Read, type Position } from "../../shared/types.ts";
import { Pitch } from "./Pitch.tsx";

/** How the AI read the brief: its own summary, the positions on a pitch, and the requirements as chips. */
export function BriefRead({
  read,
  selectedPosition,
  busy,
  scopesBoard,
  onShowBrief,
}: {
  read: Read | null;
  selectedPosition?: Position;
  busy: boolean;
  /** False while the board shows the assistant's picks rather than the brief's results. */
  scopesBoard: boolean;
  onShowBrief: () => void;
}) {
  return (
    <section className={`pane-section read${read && !scopesBoard ? " is-parked" : ""}`} aria-busy={busy}>
      <header className="section-head">
        <h2>How the AI read the brief</h2>
      </header>

      {read && !scopesBoard && (
        <div className="parked-note small">
          <p>The board shows the assistant's picks.</p>
          <button className="link-btn" onClick={onShowBrief}>
            Show brief results
          </button>
        </div>
      )}

      {read ? (
        <p className="read-explanation">{read.summary}</p>
      ) : (
        <p className="muted small">Write a brief above. The AI searches the web for real, current players who fit, and shows how it read your brief here.</p>
      )}

      <div className="read-grid">
        <Pitch searched={read?.positions ?? []} selected={selectedPosition} />
        <div className="read-legend small">
          {read ? (
            <>
              <p className="read-positions">{read.positions.length ? read.positions.map((p) => POSITIONS[p]).join(", ") : "Any position"}</p>
              <ul className="pitch-key">
                <li>
                  <i className="key-searched" aria-hidden /> Searched
                </li>
                <li>
                  <i className="key-selected" aria-hidden /> Open player
                </li>
              </ul>
            </>
          ) : (
            <p className="faint">Positions light up when a brief names them.</p>
          )}
        </div>
      </div>

      {read && read.filters.length > 0 && (
        <div className="chip-block">
          <h3 className="mini-head">Requirements</h3>
          <ul className="chips">
            {read.filters.map((f) => (
              <li key={f} className="chip is-static">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
