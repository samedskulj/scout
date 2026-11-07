import { ArrowUp, Globe, LayoutList, Search, Shield, UserRound } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AssistantResponse, AssistantStep, AssistantTool, ChatTurn, RealCard, Source } from "../../shared/types.ts";
import { apiStream, asApiError, type ApiError } from "../ui/index.ts";
import { SourceList } from "./bits.tsx";
import { ApiErrorNote } from "./PlayerPanel.tsx";

interface Entry extends ChatTurn {
  steps?: AssistantStep[];
  cards?: RealCard[];
  sources?: Source[];
}

const STEP_ICON: Record<AssistantTool, typeof Search> = {
  web_search: Search,
  show_players: LayoutList,
  lookup_real_player: UserRound,
  lookup_club: Shield,
};
const STEP_VERB: Record<AssistantTool, string> = {
  web_search: "Searched",
  show_players: "Put on the board",
  lookup_real_player: "Looked up",
  lookup_club: "Looked up club",
};

export function Assistant({
  selectedName,
  brief,
  board,
  onResult,
}: {
  selectedName: string | null;
  brief: string | null;
  board: string[];
  onResult: (res: AssistantResponse) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<string[]>([]);
  const [error, setError] = useState<ApiError>();
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries, loading, live]);

  const suggestions = [
    selectedName ? `Find me a cheaper version of ${selectedName}` : "Find a pressing striker under 24 for less than €25m",
    board.length ? "Who is the best value on the board?" : "Best young goalkeepers in the Bundesliga right now?",
    selectedName ? `Any injury or transfer news on ${selectedName}?` : "Who plays like Bukayo Saka but costs half as much?",
  ];

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Entry[] = [...entries, { role: "user", content }];
    setEntries(next);
    setDraft("");
    setError(undefined);
    setLive([]);
    setLoading(true);
    try {
      const res = await apiStream<AssistantResponse>(
        "/api/assistant",
        { messages: next.map(({ role, content }) => ({ role, content })), context: { selected: selectedName, brief, board: board.slice(0, 20) } },
        (l) => setLive((x) => [...x, l]),
      );
      setEntries([...next, { role: "assistant", content: res.reply, steps: res.steps, cards: res.cards, sources: res.sources }]);
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
        <span className="faint small">Searches the web live</span>
      </header>

      <ol className="chat-log" ref={logRef} aria-live="polite">
        {entries.length === 0 && (
          <li className="chat-intro">
            <p className="muted small">Ask anything in plain English. The assistant searches the web for current facts, puts its picks on the board, and shows photos of players and clubs.</p>
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
            {e.cards && e.cards.length > 0 && <RealCards cards={e.cards} />}
            {e.role === "assistant" ? <RichReply text={e.content} /> : <p className="bubble">{e.content}</p>}
            {e.sources && e.sources.length > 0 && <SourceList sources={e.sources.slice(0, 5)} compact />}
          </li>
        ))}
        {loading && (
          <li className="msg msg-assistant">
            <p className="bubble thinking">
              <Globe aria-hidden /> {live.at(-1) ?? "Searching the web"}
            </p>
          </li>
        )}
      </ol>

      <ApiErrorNote error={error} onRetry={() => void send(draft)} />

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

const age = (born: string | null) => {
  if (!born) return null;
  const d = new Date(born);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

/** Picture cards for real players and clubs, from TheSportsDB. Images fail quietly to initials. */
function RealCards({ cards }: { cards: RealCard[] }) {
  return (
    <ul className="real-cards" aria-label="Real-world lookups">
      {cards.map((c) =>
        c.kind === "player" ? (
          <li key={`p${c.id}`} className="real-card">
            <Picture src={c.cutout ?? c.photo} alt={c.name} fallback={c.name} className="real-photo" />
            <div className="real-text">
              <b>
                {c.name}
                {c.number && <span className="real-number">#{c.number}</span>}
              </b>
              <span className="real-club">
                {c.clubBadge && <Picture src={c.clubBadge} alt="" fallback="" className="real-badge" />}
                {c.club ?? "Club unknown"}
              </span>
              <span className="faint">
                {[c.position, c.nationality, age(c.born) !== null ? `age ${age(c.born)}` : null, c.height].filter(Boolean).join(" · ")}
              </span>
            </div>
          </li>
        ) : (
          <li key={`c${c.id}`} className="real-card">
            <Picture src={c.badge} alt={`${c.name} badge`} fallback={c.name} className="real-photo is-badge" />
            <div className="real-text">
              <b>{c.name}</b>
              <span className="real-club">{[c.league, c.country].filter(Boolean).join(" · ")}</span>
              <span className="faint">{[c.stadium, c.founded ? `founded ${c.founded}` : null].filter(Boolean).join(" · ")}</span>
            </div>
          </li>
        ),
      )}
      <li className="real-source faint">Real-world facts and images: TheSportsDB</li>
    </ul>
  );
}

function Picture({ src, alt, fallback, className }: { src: string | null; alt: string; fallback: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return fallback ? (
      <span className={`${className} is-fallback`} aria-hidden>
        {fallback
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)}
      </span>
    ) : null;
  }
  // Remote images from TheSportsDB's CDN; next/image would need every host allow-listed and adds nothing here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/** **bold** inside a line; no other markdown is interpreted, and nothing is injected as HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Assistant replies: paragraphs, "- " bullet lists and bold, rendered as React elements. */
function RichReply({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    if (bullets.length)
      blocks.push(
        <ul key={blocks.length}>
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
    para = [];
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (!line) flush();
    else if (bullet) {
      if (para.length) flush();
      bullets.push(bullet[1]!);
    } else {
      if (bullets.length) flush();
      para.push(line);
    }
  }
  flush();
  return <div className="bubble rich">{blocks}</div>;
}
