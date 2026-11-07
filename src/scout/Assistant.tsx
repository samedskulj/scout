import { ArrowUp, Database, LayoutList, Search, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AiSource, AssistantResponse, AssistantStep, ChatTurn } from "../../shared/types.ts";
import { apiPost, asApiError, type ApiError } from "../ui/index.ts";
import { EngineError } from "./PlayerPanel.tsx";

interface Entry extends ChatTurn {
  steps?: AssistantStep[];
  source?: AiSource;
}

const STEP_ICON = { search_players: Search, get_player: UserRound, compare_players: Users, show_shortlist: LayoutList } as const;
const STEP_VERB = { search_players: "Searched", get_player: "Opened", compare_players: "Compared", show_shortlist: "Put on the board" } as const;

export function Assistant({
  selectedId,
  selectedName,
  brief,
  engine,
  onResult,
  onEngineFallback,
}: {
  selectedId: string | null;
  selectedName: string | null;
  brief: string | null;
  engine?: AiSource;
  onResult: (res: AssistantResponse) => void;
  onEngineFallback: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError>();
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries, loading]);

  const suggestions = [
    selectedName ? `Find me a cheaper version of ${selectedName}` : "Find a pressing striker under 24 for less than £20m",
    "Who is the best value on the board?",
    selectedName ? `What are ${selectedName}'s weaknesses?` : "Compare the top three",
  ];

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Entry[] = [...entries, { role: "user", content }];
    setEntries(next);
    setDraft("");
    setError(undefined);
    setLoading(true);
    try {
      const res = await apiPost<AssistantResponse>("/api/assistant", {
        messages: next.map(({ role, content }) => ({ role, content })),
        context: { selectedId, brief },
        engine,
      });
      setEntries([...next, { role: "assistant", content: res.reply, steps: res.steps, source: res.source }]);
      onResult(res);
    } catch (err) {
      setError(asApiError(err));
      setEntries(entries);
      setDraft(content);
    } finally {
      setLoading(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  return (
    <section className="pane-section assistant" aria-label="Scout assistant">
      <header className="section-head">
        <h2>Assistant</h2>
        <span className="faint small">Searches the database for you</span>
      </header>

      <ol className="chat-log" ref={logRef} aria-live="polite">
        {entries.length === 0 && (
          <li className="chat-intro">
            <p className="muted small">Ask follow-ups in plain English. The assistant runs real searches and puts its picks on the board.</p>
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s}>
                  <button className="suggestion" onClick={() => void send(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}
        {entries.map((e, i) => (
          <li key={i} className={`msg msg-${e.role}`}>
            {e.steps && e.steps.length > 0 && (
              <ul className="steps" aria-label="What the assistant looked up">
                {e.steps.map((s, j) => {
                  const Icon = STEP_ICON[s.tool];
                  return (
                    <li key={j}>
                      <Icon aria-hidden />
                      <span>
                        <b>{STEP_VERB[s.tool]}</b> {s.summary}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="bubble">{e.content}</p>
            {e.source === "offline" && <span className="faint small">Keyword engine</span>}
          </li>
        ))}
        {loading && (
          <li className="msg msg-assistant">
            <p className="bubble thinking">
              <Database aria-hidden /> Looking through the database
            </p>
          </li>
        )}
      </ol>

      <EngineError error={error} onFallback={onEngineFallback} />

      <form className="chat-input" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-input">
          Message the assistant
        </label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={selectedName ? `Ask about ${selectedName}, or anyone…` : "Ask the assistant…"}
          maxLength={4000}
          autoComplete="off"
        />
        <button type="submit" className="send" disabled={!draft.trim() || loading} aria-label="Send">
          <ArrowUp aria-hidden />
        </button>
      </form>
    </section>
  );
}
