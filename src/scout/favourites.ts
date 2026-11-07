import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Position, ScoutPlayer } from "../../shared/types.ts";

/**
 * Favourite players and the tactic board they're arranged on. Saved in this browser, per signed-in scout.
 * Each favourite is a snapshot of the real player as he was found, so the board works without searching again.
 * Coordinates are percentages of a vertical pitch: x from the left touchline, y from the goal being attacked.
 */

export type Spot = [x: number, y: number];

const GK: Spot = [50, 90];

/** Slot 0 is always the goalkeeper; the rest are the outfield shape. */
export const FORMATIONS = {
  "4-3-3": [GK, [14, 70], [37, 76], [63, 76], [86, 70], [30, 52], [50, 58], [70, 52], [18, 26], [50, 18], [82, 26]],
  "4-4-2": [GK, [14, 70], [37, 76], [63, 76], [86, 70], [14, 47], [38, 52], [62, 52], [86, 47], [38, 21], [62, 21]],
  "4-2-3-1": [GK, [14, 70], [37, 76], [63, 76], [86, 70], [38, 60], [62, 60], [18, 36], [50, 38], [82, 36], [50, 17]],
  "3-5-2": [GK, [27, 75], [50, 78], [73, 75], [10, 57], [50, 61], [34, 46], [66, 46], [90, 57], [39, 21], [61, 21]],
  "3-4-3": [GK, [27, 75], [50, 78], [73, 75], [12, 57], [38, 52], [62, 52], [88, 57], [20, 25], [50, 18], [80, 25]],
} satisfies Record<string, Spot[]>;
export type FormationId = keyof typeof FORMATIONS;
export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

export const SLOT_COUNT = 11;

export interface BoardState {
  formation: FormationId;
  /** Player id per slot, or null for an empty slot. */
  lineup: (string | null)[];
  /** Where each slot sits; starts at the formation's shape and moves when a token is dragged onto open grass. */
  spots: Spot[];
}

interface Saved {
  players: ScoutPlayer[];
  board: BoardState;
}

const freshBoard = (formation: FormationId = "4-3-3", lineup: (string | null)[] = Array(SLOT_COUNT).fill(null)): BoardState => ({
  formation,
  lineup,
  spots: FORMATIONS[formation].map(([x, y]) => [x, y] as Spot),
});

const EMPTY: Saved = { players: [], board: freshBoard() };

/** The role a spot on the pitch implies, from where it is: depth first, then how wide. */
export function roleAt([x, y]: Spot): Position {
  const wide = (edge: number) => x < edge || x > 100 - edge;
  if (y >= 84) return "GK";
  if (y >= 64) return wide(24) ? "FB" : "CB";
  if (y >= 56) return wide(22) ? "FB" : "DM";
  if (y >= 42) return wide(24) ? "W" : "CM";
  if (y >= 30) return wide(28) ? "W" : "AM";
  return wide(30) ? "W" : "ST";
}

/** Positions a player can cover reasonably well from his natural one. */
const NEIGHBOURS: Record<Position, Position[]> = {
  GK: [],
  CB: ["DM", "FB"],
  FB: ["CB", "W"],
  DM: ["CB", "CM"],
  CM: ["DM", "AM"],
  AM: ["CM", "W", "ST"],
  W: ["AM", "FB", "ST"],
  ST: ["AM", "W"],
};

export type Fit = "natural" | "can-play" | "out";
export const fitFor = (natural: Position, role: Position): Fit =>
  natural === role ? "natural" : NEIGHBOURS[natural].includes(role) ? "can-play" : "out";

const isPlayer = (p: unknown): p is ScoutPlayer =>
  typeof p === "object" && p !== null && typeof (p as ScoutPlayer).id === "string" && typeof (p as ScoutPlayer).name === "string" && typeof (p as ScoutPlayer).position === "string";

function load(key: string): Saved {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw) as Partial<Saved>;
    const players = Array.isArray(saved.players) ? saved.players.filter(isPlayer) : [];
    const ids = new Set(players.map((p) => p.id));
    const b = saved.board;
    const formation = b && b.formation in FORMATIONS ? b.formation : "4-3-3";
    const lineup = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const id = b?.lineup?.[i];
      return typeof id === "string" && ids.has(id) ? id : null;
    });
    const spots =
      Array.isArray(b?.spots) && b.spots.length === SLOT_COUNT && b.spots.every((s) => Array.isArray(s) && s.length === 2)
        ? b.spots
        : freshBoard(formation).spots;
    return { players, board: { formation, lineup, spots } };
  } catch {
    return EMPTY;
  }
}

export interface Favourites {
  players: ScoutPlayer[];
  byId: Record<string, ScoutPlayer>;
  has: (id: string) => boolean;
  toggle: (player: ScoutPlayer) => void;
  remove: (id: string) => void;
  board: BoardState;
  setBoard: (update: (b: BoardState) => BoardState) => void;
  setFormation: (f: FormationId) => void;
  resetShape: () => void;
}

/* A tiny store over localStorage, so every component reads the same favourites and other tabs stay in sync. */
const listeners = new Set<() => void>();
const memo = new Map<string, Saved>();

function read(key: string): Saved {
  let saved = memo.get(key);
  if (!saved) {
    saved = load(key);
    memo.set(key, saved);
  }
  return saved;
}

function write(key: string, next: Saved): void {
  memo.set(key, next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the board still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key && memo.has(e.key)) {
      memo.delete(e.key);
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const withoutId = (s: Saved, id: string): Saved => ({
  players: s.players.filter((p) => p.id !== id),
  board: { ...s.board, lineup: s.board.lineup.map((x) => (x === id ? null : x)) },
});

export function useFavourites(userKey: string | undefined): Favourites {
  // v2: favourites are real-player snapshots (v1 held ids into the old demo database).
  const storageKey = `scout-copilot:favourites-v2:${userKey ?? "local"}`;
  const state = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => EMPTY,
  );
  const setState = useCallback((update: (s: Saved) => Saved) => write(storageKey, update(read(storageKey))), [storageKey]);

  const toggle = useCallback(
    (player: ScoutPlayer) => setState((s) => (s.players.some((p) => p.id === player.id) ? withoutId(s, player.id) : { ...s, players: [...s.players, player] })),
    [setState],
  );
  const remove = useCallback((id: string) => setState((s) => withoutId(s, id)), [setState]);
  const setBoard = useCallback((update: (b: BoardState) => BoardState) => setState((s) => ({ ...s, board: update(s.board) })), [setState]);
  const setFormation = useCallback((f: FormationId) => setState((s) => ({ ...s, board: freshBoard(f, s.board.lineup) })), [setState]);
  const resetShape = useCallback(() => setState((s) => ({ ...s, board: freshBoard(s.board.formation, s.board.lineup) })), [setState]);

  return useMemo(() => {
    const byId = Object.fromEntries(state.players.map((p) => [p.id, p]));
    return { players: state.players, byId, has: (id: string) => id in byId, toggle, remove, board: state.board, setBoard, setFormation, resetShape };
  }, [state, toggle, remove, setBoard, setFormation, resetShape]);
}
