import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import type {
  AiSource,
  AssistantResponse,
  Interpretation,
  Match,
  Meta,
  SearchResponse,
  SearchSpec,
} from "../shared/types.ts";
import { Assistant } from "./scout/Assistant.tsx";
import { BriefRead } from "./scout/BriefRead.tsx";
import { EngineError, PlayerPanel } from "./scout/PlayerPanel.tsx";
import { Shortlist } from "./scout/Shortlist.tsx";
import { apiPost, asApiError, Button, Segmented, useFetch, type ApiError } from "./ui/index.ts";

type BoardView = "brief" | "assistant";

export function SearchView({ engine, onEngineChange: setEngine }: { engine?: AiSource; onEngineChange: (e: AiSource) => void }) {
  const meta = useFetch<Meta>("/api/meta").data;
  const [query, setQuery] = useState("");
  const [brief, setBrief] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [assistantBoard, setAssistantBoard] = useState<{ title: string; matches: Match[] } | null>(null);
  const [view, setView] = useState<BoardView>("brief");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "searching">("idle");
  const [error, setError] = useState<ApiError>();

  async function runSearch(spec: SearchSpec) {
    setStatus("searching");
    try {
      const res = await apiPost<SearchResponse>("/api/search", { spec });
      setResults(res);
      setView("brief");
      setSelectedId((id) => (res.matches.some((m) => m.player.id === id) ? id : (res.matches[0]?.player.id ?? id)));
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setStatus("idle");
    }
  }

  async function runBrief(text: string, useEngine = engine) {
    const q = text.trim();
    if (q.length < 3) return;
    setQuery(q);
    setBrief(q);
    setError(undefined);
    setStatus("reading");
    try {
      const interp = await apiPost<Interpretation>("/api/interpret", { query: q, engine: useEngine });
      setInterpretation(interp);
      await runSearch(interp.spec);
    } catch (err) {
      setError(asApiError(err));
      setStatus("idle");
    }
  }

  const fallBackToKeywords = () => {
    setEngine("offline");
    setError(undefined);
    if (brief && !interpretation) void runBrief(brief, "offline");
  };

  const editSpec = (spec: SearchSpec) => {
    if (!interpretation) return;
    setInterpretation({ ...interpretation, spec });
    void runSearch(spec);
  };

  const onAssistant = (res: AssistantResponse) => {
    if (res.shortlist) {
      setAssistantBoard(res.shortlist);
      setView("assistant");
    }
    if (res.focusId) setSelectedId(res.focusId);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void runBrief(query);
  };

  const showing = view === "assistant" && assistantBoard ? assistantBoard.matches : (results?.matches ?? []);
  const allPlayers = [...(results?.matches ?? []), ...(assistantBoard?.matches ?? [])].map((m) => m.player);
  const selected = allPlayers.find((p) => p.id === selectedId) ?? null;
  const busy = status !== "idle";

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
            placeholder="Describe the player like you'd say it: left-footed centre-back under 24, comfortable on the ball, max £30m"
            maxLength={500}
            autoComplete="off"
          />
          <Button type="submit" loading={busy} disabled={query.trim().length < 3}>
            {status === "reading" ? "Reading brief" : status === "searching" ? "Ranking" : "Scout"}
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
        <EngineError error={error} onFallback={fallBackToKeywords} />
      </form>

      <div className="panes">
        <aside className="pane pane-ai">
          <BriefRead
            interpretation={interpretation}
            selectedPosition={selected?.position}
            busy={busy}
            scopesBoard={view === "brief" || !assistantBoard}
            onShowBrief={() => setView("brief")}
            onChange={editSpec}
          />
          <Assistant
            selectedId={selectedId}
            selectedName={selected?.name ?? null}
            brief={brief}
            engine={engine}
            onResult={onAssistant}
            onEngineFallback={() => setEngine("offline")}
          />
        </aside>

        <section className="pane pane-board" aria-label="Shortlist" aria-busy={busy}>
          <header className="board-head">
            <h2 className="board-title">
              {view === "assistant" && assistantBoard
                ? assistantBoard.title
                : results
                  ? results.target
                    ? `Closest profiles to ${results.target.name} · ${results.total} players fit`
                    : `${results.total} players fit · top ${results.matches.length} by weighted percentile`
                  : `${meta?.playerCount ?? 300} players in the database`}
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
            {showing.length ? (
              <Shortlist
                matches={showing}
                selectedId={selectedId}
                scoreLabel={view === "brief" && results?.target ? "Alike" : "Fit"}
                onSelect={setSelectedId}
              />
            ) : results && view === "brief" ? (
              <div className="empty">
                Nobody fits every filter. Remove a filter on the left, or loosen the brief.
              </div>
            ) : (
              <BoardIntro />
            )}
          </div>
        </section>

        <section className="pane pane-profile" aria-label="Player profile">
          {selectedId ? (
            <PlayerPanel
              key={selectedId}
              playerId={selectedId}
              brief={brief}
              engine={engine}
              onSelect={setSelectedId}
              onEngineFallback={() => setEngine("offline")}
            />
          ) : (
            <div className="profile-empty">
              <h2>Player profile</h2>
              <p className="muted">Pick a player from the shortlist to open his attribute sheet, compare him with similar profiles and get a checked report.</p>
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
          <b>Brief it.</b> Claude turns your words into positions, filters and priorities on the left. Change any of them.
          </span>
        </li>
        <li>
          <span>
          <b>Read the ranking.</b> Players rank by their percentiles in what you asked for. Every row shows the attributes that put him there.
          </span>
        </li>
        <li>
          <span>
          <b>Open a player.</b> A 1–20 attribute sheet, ability stars, a radar against similar or cheaper profiles, and a report checked against
          the data.
          </span>
        </li>
        <li>
          <span>
          <b>Ask the assistant.</b> Follow-ups like "someone cheaper" or "compare the top three" run real searches and update this board.
          </span>
        </li>
      </ol>
    </div>
  );
}
