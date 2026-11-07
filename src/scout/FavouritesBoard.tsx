import { Move, RotateCcw, Sparkles, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { dash, eur } from "../../shared/format.ts";
import { POSITIONS, type Position, type ScoutPlayer } from "../../shared/types.ts";
import { Button } from "../ui/index.ts";
import { Avatar, ClubBadge, FitScore, SourceList, surname } from "./bits.tsx";
import { FORMATION_IDS, fitFor, roleAt, SLOT_COUNT, type Favourites, type Fit, type FormationId, type Spot } from "./favourites.ts";

type Source = { kind: "slot"; index: number } | { kind: "bench"; id: string };

interface Drag {
  source: Source;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

const FIT_LABEL: Record<Fit, string> = { natural: "Natural position", "can-play": "Can play here", out: "Out of position" };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Spot, b: Spot) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** The round token on the pitch: the player's photo when there is one, initials otherwise. */
function Disc({ player }: { player: ScoutPlayer }) {
  return (
    <span className="tb-disc">
      <Avatar player={player} size={40} prefer="cutout" className="tb-photo" />
    </span>
  );
}

export function FavouritesBoard({ favourites, onGoScouting }: { favourites: Favourites; onGoScouting: () => void }) {
  const { players, byId, board, setBoard, setFormation, resetShape, remove } = favourites;
  const pitchRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** Pick-and-place for touch and keyboard, started from the player card's Move button. */
  const [picked, setPicked] = useState<Source | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const roles = useMemo(() => board.spots.map(roleAt), [board.spots]);
  const onPitch = new Set(board.lineup.filter((x): x is string => Boolean(x)));
  const bench = players.filter((p) => !onPitch.has(p.id));
  const focus = focusId ? byId[focusId] : undefined;
  const focusSlot = focusId ? board.lineup.indexOf(focusId) : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const idOf = (s: Source) => (s.kind === "slot" ? board.lineup[s.index] : s.id) ?? null;

  /** Apply a move from a source to a slot, open grass, or the bench. */
  function move(source: Source, target: { kind: "slot"; index: number } | { kind: "grass"; spot: Spot } | { kind: "bench" }) {
    setBoard((b) => {
      const lineup = [...b.lineup];
      const spots = b.spots.map((s) => [...s] as Spot);
      const id = source.kind === "slot" ? lineup[source.index] : source.id;
      if (!id) return b;
      if (target.kind === "bench") {
        if (source.kind === "slot") lineup[source.index] = null;
      } else if (target.kind === "slot") {
        if (source.kind === "slot") {
          if (source.index === target.index) return b;
          [lineup[source.index], lineup[target.index]] = [lineup[target.index] ?? null, lineup[source.index] ?? null];
        } else {
          const from = lineup.indexOf(id);
          if (from >= 0) lineup[from] = null;
          lineup[target.index] = id; // whoever was there goes back to the bench
        }
      } else if (source.kind === "slot") {
        spots[source.index] = target.spot; // drag to open grass: the slot itself moves, and its role follows
      } else {
        // A bench player dropped on grass takes the nearest empty slot and moves it there.
        const empty = lineup.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
        if (!empty.length) return b;
        const nearest = empty.reduce((best, i) => (dist(spots[i]!, target.spot) < dist(spots[best]!, target.spot) ? i : best));
        lineup[nearest] = id;
        spots[nearest] = target.spot;
      }
      return { ...b, lineup, spots };
    });
  }

  function spotFromPoint(clientX: number, clientY: number): Spot | null {
    const r = pitchRef.current?.getBoundingClientRect();
    if (!r || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    return [clamp(((clientX - r.left) / r.width) * 100, 6, 94), clamp(((clientY - r.top) / r.height) * 100, 8, 92)];
  }

  function dropAt(source: Source, clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest<HTMLElement>("[data-slot]");
    if (slotEl) return move(source, { kind: "slot", index: Number(slotEl.dataset.slot) });
    if (el?.closest("[data-bench]")) return move(source, { kind: "bench" });
    const spot = spotFromPoint(clientX, clientY);
    if (spot) move(source, { kind: "grass", spot });
  }

  const startDrag = (source: Source) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !idOf(source)) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone (or synthetic); the drag still works without capture.
    }
    setDrag({ source, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { source, moved } = drag;
    setDrag(null);
    if (moved) {
      setPicked(null);
      dropAt(source, e.clientX, e.clientY);
      const id = idOf(source);
      if (id) setFocusId(id);
    } else {
      clickToken(source);
    }
  };

  /**
   * A click or tap only selects a player and shows his card. Moving needs a drag, or the card's
   * "Move" button (touch and keyboard), so browsing the board never rearranges it by accident.
   */
  function clickToken(source: Source) {
    if (picked) {
      if (source.kind === "slot") move(picked, { kind: "slot", index: source.index });
      setPicked(null);
      return;
    }
    const id = idOf(source);
    if (id) setFocusId(id);
  }

  const clickEmptySlot = (index: number) => {
    if (picked) {
      move(picked, { kind: "slot", index });
      setPicked(null);
    }
  };

  const clickGrass = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-slot]")) return;
    if (!picked) return setFocusId(null);
    const spot = spotFromPoint(e.clientX, e.clientY);
    if (spot) move(picked, { kind: "grass", spot });
    setPicked(null);
  };

  /** Start a pick-and-place for the focused player, from his slot or the bench. */
  const startMove = (id: string) => {
    const index = board.lineup.indexOf(id);
    setPicked(index >= 0 ? { kind: "slot", index } : { kind: "bench", id });
  };

  /** Fill empty slots with the best-suited favourites still on the bench: position fit first, then the AI's fit score. */
  function autoPick() {
    setBoard((b) => {
      const lineup = [...b.lineup];
      const free = players.filter((p) => !lineup.includes(p.id));
      // Two passes: every natural fit first, so a centre-back fills a centre-back slot before covering at full-back.
      for (const pass of ["natural", "can-play"] as const) {
        for (let i = 0; i < lineup.length; i++) {
          if (lineup[i]) continue;
          const role = roleAt(b.spots[i]!);
          const best = free.filter((p) => fitFor(p.position, role) === pass).sort((a, z) => z.fit - a.fit)[0];
          if (best) {
            lineup[i] = best.id;
            free.splice(free.indexOf(best), 1);
          }
        }
      }
      return { ...b, lineup };
    });
  }

  const filled = board.lineup.filter(Boolean).length;
  const dragId = drag?.moved ? idOf(drag.source) : null;
  const dragPlayer = dragId ? byId[dragId] : undefined;

  if (!players.length) {
    return (
      <div className="tb-empty">
        <Star aria-hidden />
        <h2>No favourites yet</h2>
        <p className="muted">Star real players from your search results or their profile. They land here, on a tactic board you can arrange into your ideal side.</p>
        <Button onClick={onGoScouting}>Go scouting</Button>
      </div>
    );
  }

  return (
    <div className="tb" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
      <header className="tb-toolbar">
        <div className="tb-title">
          <h2>Favourites board</h2>
          <p className="faint small">
            {filled}/{SLOT_COUNT} positions filled · {players.length} favourite{players.length === 1 ? "" : "s"}
          </p>
        </div>
        <label className="tb-formation">
          <span className="sr-only">Formation</span>
          <select value={board.formation} onChange={(e) => setFormation(e.target.value as FormationId)}>
            {FORMATION_IDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={autoPick} disabled={!bench.length || filled === SLOT_COUNT} title="Fill empty slots with the best-suited favourites">
          <Sparkles aria-hidden /> Auto-pick
        </Button>
        <Button variant="ghost" onClick={resetShape} title="Put every slot back in the formation's shape">
          <RotateCcw aria-hidden /> Reset shape
        </Button>
        <Button variant="ghost" onClick={() => setBoard((b) => ({ ...b, lineup: b.lineup.map(() => null) }))} disabled={!filled}>
          Clear
        </Button>
      </header>

      <div className="tb-body">
        <div className="tb-pitch-wrap">
          <div
            ref={pitchRef}
            className={`tb-pitch${drag?.moved ? " is-dragging" : ""}${picked ? " is-picking" : ""}`}
            onClick={clickGrass}
            aria-label={`Tactic board, ${board.formation}`}
            role="group"
          >
            <PitchMarkings />
            {board.spots.map((spot, i) => {
              const id = board.lineup[i];
              const p = id ? byId[id] : undefined;
              const role = roles[i]!;
              const fit = p ? fitFor(p.position, role) : null;
              const isPicked = picked?.kind === "slot" && picked.index === i;
              const isDragged = drag?.moved && drag.source.kind === "slot" && drag.source.index === i;
              return (
                <div
                  key={i}
                  data-slot={i}
                  className={`tb-slot${p ? ` is-filled fit-${fit}` : " is-empty"}${isPicked ? " is-picked" : ""}${isDragged ? " is-ghosted" : ""}${
                    focusId && id === focusId ? " is-focus" : ""
                  }`}
                  style={{ left: `${spot[0]}%`, top: `${spot[1]}%` }}
                >
                  {p ? (
                    <button
                      type="button"
                      className="tb-token"
                      onPointerDown={startDrag({ kind: "slot", index: i })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          clickToken({ kind: "slot", index: i });
                        }
                      }}
                      aria-label={`${p.name}, ${POSITIONS[role]} slot, ${FIT_LABEL[fit!]}. Press to open his card, or drag to move.`}
                    >
                      <Disc player={p} />
                      <span className="tb-name">{surname(p.name)}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tb-token tb-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        clickEmptySlot(i);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label={`Empty ${POSITIONS[role]} slot${picked ? ", place here" : ""}`}
                    >
                      <span className="tb-disc">+</span>
                    </button>
                  )}
                  <span className="tb-role" aria-hidden>
                    {role}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="tb-hint faint small">
            {picked
              ? "Now tap a slot or a player to place or swap, or open grass to move his position. Esc cancels."
              : "Drag a player onto a slot to place or swap, onto open grass to move his position, or onto the bench. Click a player to see his card."}
          </p>
        </div>

        <aside className="tb-side">
          {focus ? (
            <FocusCard
              player={focus}
              role={focusSlot >= 0 ? roles[focusSlot]! : null}
              moving={Boolean(picked)}
              onMove={() => startMove(focus.id)}
              onCancelMove={() => setPicked(null)}
              onClose={() => {
                setFocusId(null);
                setPicked(null);
              }}
              onBench={focusSlot >= 0 ? () => move({ kind: "slot", index: focusSlot }, { kind: "bench" }) : undefined}
              onRemove={() => {
                remove(focus.id);
                setFocusId(null);
              }}
            />
          ) : (
            <div className="tb-legend small">
              <span>
                <i className="fit-natural" /> Natural position
              </span>
              <span>
                <i className="fit-can-play" /> Can play here
              </span>
              <span>
                <i className="fit-out" /> Out of position
              </span>
            </div>
          )}

          <section className={`tb-bench${drag?.moved && drag.source.kind === "slot" ? " is-target" : ""}`} data-bench aria-label="Bench">
            <h3 className="mini-head">Bench · {bench.length}</h3>
            {bench.length ? (
              <ul>
                {bench.map((p) => {
                  const isPicked = picked?.kind === "bench" && picked.id === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`tb-bench-card${isPicked ? " is-picked" : ""}${dragId === p.id ? " is-ghosted" : ""}`}
                        onPointerDown={startDrag({ kind: "bench", id: p.id })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            clickToken({ kind: "bench", id: p.id });
                          }
                        }}
                        aria-label={`${p.name}, ${POSITIONS[p.position]}, on the bench. Press to open his card, or drag him onto the pitch.`}
                      >
                        <Avatar player={p} size={34} />
                        <span className="tb-bench-text">
                          <b>{p.name}</b>
                          <span className="faint">
                            {p.position} · {dash(p.age)} · {p.club ?? "Club unknown"}
                          </span>
                        </span>
                        <FitScore fit={p.fit} label="Fit when found" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="faint small">Everyone is on the pitch. Drag a player here to bench him.</p>
            )}
          </section>
        </aside>
      </div>

      {dragPlayer && drag && (
        <div className="tb-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <Disc player={dragPlayer} />
          <span className="tb-name">{surname(dragPlayer.name)}</span>
        </div>
      )}
    </div>
  );
}

function FocusCard({
  player: p,
  role,
  moving,
  onMove,
  onCancelMove,
  onClose,
  onBench,
  onRemove,
}: {
  player: ScoutPlayer;
  role: Position | null;
  moving: boolean;
  onMove: () => void;
  onCancelMove: () => void;
  onClose: () => void;
  onBench?: () => void;
  onRemove: () => void;
}) {
  const fit = role ? fitFor(p.position, role) : null;
  return (
    <section className="tb-focus" aria-label={`${p.name} summary`}>
      <header>
        <Avatar player={p} size={52} />
        <div className="tb-focus-id">
          <h3>{p.name}</h3>
          <p className="faint small">
            <ClubBadge src={p.clubBadge} size={14} /> {[p.club, p.league].filter(Boolean).join(" · ") || "Club unknown"}
          </p>
          <p className="faint small">
            {p.role} · {dash(p.age)} · {eur(p.market_value_eur_m)}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close summary">
          <X aria-hidden />
        </button>
      </header>
      {role && fit && (
        <p className={`tb-fit fit-${fit}`}>
          <i /> {FIT_LABEL[fit]} as {POSITIONS[role].toLowerCase()}
        </p>
      )}
      <ul className="tb-attrs">
        <li>
          <span>{p.season} league</span>
          <b>
            {dash(p.appearances)} apps · {dash(p.goals)} G · {dash(p.assists)} A
          </b>
        </li>
        {p.key_stats.slice(0, 5).map((s) => (
          <li key={s.label}>
            <span>{s.label}</span>
            <b>{s.value}</b>
          </li>
        ))}
      </ul>
      <SourceList sources={p.sources.slice(0, 3)} compact />
      <div className="row">
        {moving ? (
          <Button variant="secondary" onClick={onCancelMove}>
            Cancel move
          </Button>
        ) : (
          <Button variant="secondary" onClick={onMove}>
            <Move aria-hidden /> {role ? "Move" : "Place on pitch"}
          </Button>
        )}
        {onBench && !moving && (
          <Button variant="secondary" onClick={onBench}>
            To the bench
          </Button>
        )}
        <Button variant="ghost" onClick={onRemove}>
          <Trash2 aria-hidden /> Unfavourite
        </Button>
      </div>
    </section>
  );
}

function PitchMarkings() {
  return (
    <svg className="tb-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden>
      <rect x="2" y="2" width="64" height="101" />
      <line x1="2" y1="52.5" x2="66" y2="52.5" />
      <circle cx="34" cy="52.5" r="9.15" />
      <circle cx="34" cy="52.5" r="0.5" className="fill" />
      <rect x="13.85" y="2" width="40.3" height="16.5" />
      <rect x="24.84" y="2" width="18.32" height="5.5" />
      <path d="M26.7 18.5 A 9.15 9.15 0 0 0 41.3 18.5" />
      <rect x="13.85" y="86.5" width="40.3" height="16.5" />
      <rect x="24.84" y="97.5" width="18.32" height="5.5" />
      <path d="M26.7 86.5 A 9.15 9.15 0 0 1 41.3 86.5" />
      <circle cx="34" cy="13" r="0.5" className="fill" />
      <circle cx="34" cy="92" r="0.5" className="fill" />
    </svg>
  );
}
