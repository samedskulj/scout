import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AssistantResponse, Meta, ScoutPlayer, ScoutResponse } from "../shared/types.ts";
import { Assistant } from "./scout/Assistant.tsx";
import { SearchLog } from "./scout/bits.tsx";
import { BriefRead } from "./scout/BriefRead.tsx";
import type { Favourites } from "./scout/favourites.ts";
import { ApiErrorNote, PlayerPanel } from "./scout/PlayerPanel.tsx";
import { Shortlist } from "./scout/Shortlist.tsx";
import { apiStream, asApiError, Button, Segmented, useFetch, type ApiError } from "./ui/index.ts";

type BoardView = "brief" | "assistant";

export function SearchView({ favourites }: { favourites: Favourites }) {
  const meta = useFetch<Meta>("/api/meta").data;
  const [query, setQuery] = useState("");
  const [brief, setBrief] = useState<string | null>(null);
  const [results, setResults] = useState<ScoutResponse | null>(null);
  const [assistantBoard, setAssistantBoard] = useState<{ title: string; players: ScoutPlayer[] } | null>(null);
  const [view, setView] = useState<BoardView>("brief");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<ApiError>();

  async function runBrief(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setQuery(q);
    setBrief(q);
    setError(undefined);
    setLines([]);
    setBusy(true);
    try {
      const res = await apiStream<ScoutResponse>("/api/scout", { query: q }, (l) => setLines((x) => [...x, l]));
      setResults(res);
      setView("brief");
      setSelectedId(res.players[0]?.id ?? null);
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const onAssistant = (res: AssistantResponse) => {
    if (res.board) {
      setAssistantBoard(res.board);
      setView("assistant");
      setSelectedId(res.board.players[0]?.id ?? null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void runBrief(query);
  };

  const showing = view === "assistant" && assistantBoard ? assistantBoard.players : (results?.players ?? []);
  const allPlayers = [...(results?.players ?? []), ...(assistantBoard?.players ?? []), ...favourites.players];
  const selected = allPlayers.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="workspace">
      <form className="brief-bar" onSubmit={submit}>
        <label htmlFor="brief" className="brief-label">
          Scouting brief
        </label>
        <div className="brief-row">
          <Search className="brief-icon" aria-hidden />
          <input
            id="brief"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the player like you'd say it: left-footed centre-back under 24, comfortable on the ball, max €35m"
            maxLength={500}
            autoComplete="off"
          />
          <Button type="submit" loading={busy} disabled={query.trim().length < 3}>
            {busy ? "Searching" : "Scout"}
          </Button>
        </div>
        {meta && (
          <div className="examples">
            <span className="faint small">Try</span>
            {meta.examples.map((ex) => (
              <button type="button" key={ex} className="example" onClick={() => void runBrief(ex)} disabled={busy}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <ApiErrorNote error={error} onRetry={brief ? () => void runBrief(brief) : undefined} />
      </form>

      <div className="panes">
        <aside className="pane pane-ai">
          <BriefRead
            read={results?.read ?? null}
            selectedPosition={selected?.position}
            busy={busy}
            scopesBoard={view === "brief" || !assistantBoard}
            onShowBrief={() => setView("brief")}
          />
          <Assistant
            selectedName={selected ? `${selected.name}${selected.club ? ` (${selected.club})` : ""}` : null}
            brief={brief}
            board={showing.map((p) => `${p.name}${p.club ? ` (${p.club})` : ""}`)}
            onResult={onAssistant}
          />
        </aside>

        <section className="pane pane-board" aria-label="Shortlist" aria-busy={busy}>
          <header className="board-head">
            <h2 className="board-title">
              {view === "assistant" && assistantBoard
                ? assistantBoard.title
                : results
                  ? `${results.players.length} real player${results.players.length === 1 ? "" : "s"} found · searched ${results.searchedAt}`
                  : "Real players, found live on the web"}
            </h2>
            {assistantBoard && (
              <Segmented
                label="Which board"
                value={view}
                onChange={setView}
                options={[
                  { value: "brief", label: "Brief results", disabled: !results },
                  { value: "assistant", label: "Assistant's picks" },
                ]}
              />
            )}
          </header>
          <div className="board-scroll">
            {busy && <SearchLog lines={lines} title="Searching the web for players" />}
            {showing.length ? (
              <Shortlist players={showing} selectedId={selectedId} onSelect={setSelectedId} favourites={favourites} />
            ) : results && view === "brief" && !busy ? (
              <div className="empty">Nobody fit every requirement with a source to back it. Loosen the brief, or ask the assistant for near misses.</div>
            ) : (
              !busy && <BoardIntro />
            )}
          </div>
        </section>

        <section className="pane pane-profile" aria-label="Player profile">
          {selected ? (
            <PlayerPanel key={selected.id} player={selected} brief={brief} favourites={favourites} />
          ) : (
            <div className="profile-empty">
              <h2>Player profile</h2>
              <p className="muted">Pick a player to see his photo, this season's stats, a checked report and where every fact came from. Star him for your favourites board.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BoardIntro() {
  return (
    <div className="board-intro">
      <h3>From brief to shortlist</h3>
      <ol>
        <li>
          <span>
            <b>Brief it.</b> Write what you need the way the head coach said it. The AI reads it and searches the web for real, current players.
          </span>
        </li>
        <li>
          <span>
            <b>Check the facts.</b> Every player comes with this season's numbers and the pages they came from. Anything it couldn't find shows as a
            dash, never a guess.
          </span>
        </li>
        <li>
          <span>
            <b>Open a player.</b> His photo, full season stats, recent seasons and news, and a scouting report checked against his numbers.
          </span>
        </li>
        <li>
          <span>
            <b>Ask the assistant.</b> Follow-ups like "someone cheaper" or "who plays like Saka" run new searches and update this board.
          </span>
        </li>
      </ol>
    </div>
  );
}
