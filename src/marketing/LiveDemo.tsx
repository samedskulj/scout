"use client";

import { ArrowRight, CornerDownLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dash, eur } from "../../shared/format.ts";
import { EXAMPLE_BRIEFS, POSITIONS, type DemoResponse } from "../../shared/types.ts";
import { Avatar, ClubBadge, FitScore, SearchLog, SourceList } from "../scout/bits.tsx";
import { apiStream, asApiError } from "../ui/api.ts";

export const DEMO_BRIEFS = EXAMPLE_BRIEFS.slice(0, 3);

const SETTLE = "animate-[row-settle_320ms_cubic-bezier(0.16,1,0.3,1)_both]";

function Step({ n, id, children, aside }: { n: number; id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <h2 id={id} className="mb-3.5 flex items-center gap-2.5 text-xs font-semibold tracking-wider text-faint uppercase">
      <span className="inline-grid size-5 place-items-center rounded-md bg-brand-soft text-brand-strong">{n}</span>
      {children}
      {aside && <em className="ml-auto text-[12.5px] font-medium tracking-normal normal-case not-italic">{aside}</em>}
    </h2>
  );
}

/** The hero: a working brief → real players found live on the web → one player's card. */
export function LiveDemo({ onResult }: { onResult?: (res: DemoResponse) => void }) {
  const [query, setQuery] = useState(DEMO_BRIEFS[0]!);
  const [data, setData] = useState<DemoResponse | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [run, setRun] = useState(0);

  const runBrief = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(undefined);
      setLines([]);
      try {
        const res = await apiStream<DemoResponse>("/api/demo", { query: q }, (l) => setLines((x) => [...x, l]));
        setData(res);
        setSelected(0);
        setRun((n) => n + 1);
        onResult?.(res);
      } catch (err) {
        setError(asApiError(err).message);
      } finally {
        setLoading(false);
      }
    },
    [onResult],
  );

  // First load: run the default brief (cached for the day) so the strip is never empty.
  useEffect(() => {
    let cancelled = false;
    apiStream<DemoResponse>("/api/demo", { query: DEMO_BRIEFS[0] }, (l) => !cancelled && setLines((x) => [...x, l])).then(
      (res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
        onResult?.(res);
      },
      (err) => {
        if (cancelled) return;
        setError(asApiError(err).message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [onResult]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 3 && !loading) void runBrief(query);
  };

  const p = data?.players[selected];

  return (
    <div
      className="grid gap-px bg-border text-sm md:grid-cols-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)_minmax(0,1fr)]"
      aria-busy={loading}
    >
      <section className="min-w-0 bg-card p-5" aria-labelledby="demo-1">
        <Step n={1} id="demo-1">
          The brief
        </Step>
        <form onSubmit={submit}>
          <label htmlFor="demo-input" className="sr-only">
            Write a scouting brief
          </label>
          <textarea
            id="demo-input"
            value={query}
            rows={4}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-base leading-normal font-medium caret-brand outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-3 focus:ring-brand-soft"
          />
          <Button type="submit" className="mt-2.5 h-10 w-full rounded-xl" disabled={loading || query.trim().length < 3}>
            {loading ? "Searching the web…" : "Run this brief"}
            <CornerDownLeft />
          </Button>
        </form>
        <div className="mt-3 grid gap-1.5">
          {DEMO_BRIEFS.filter((b) => b !== query).map((b) => (
            <button
              key={b}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuery(b);
                void runBrief(b);
              }}
              className="rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] leading-snug text-muted-foreground transition-colors hover:border-input hover:bg-secondary hover:text-foreground disabled:opacity-60"
            >
              {b}
            </button>
          ))}
        </div>
        {data && (
          <div className="mt-4 border-t pt-3.5">
            <h3 className="mb-2 text-[11.5px] font-semibold tracking-wider text-faint uppercase">Read as</h3>
            <ul className="flex flex-wrap gap-1.5">
              {[...new Set([...data.read.positions.map((x) => POSITIONS[x]), ...data.read.filters])].map((c) => (
                <li key={c} className="rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-medium text-brand-strong">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="order-3 min-w-0 bg-card p-5 md:col-span-2 lg:order-none lg:col-span-1" aria-labelledby="demo-2">
        <Step n={2} id="demo-2" aside={data && !loading && `${data.players.length} real players · ${data.searchedAt}`}>
          The shortlist
        </Step>
        {loading && <SearchLog lines={lines} title="Searching the web for players" />}
        {error && <p className="rounded-xl border border-dashed border-input p-3 text-bad">{error}</p>}
        {!loading && data && data.players.length === 0 && (
          <p className="rounded-xl border border-dashed border-input p-3 text-muted-foreground">
            Nobody fit every requirement with a source to back it. Loosen the brief and run it again.
          </p>
        )}
        {!loading && (
          <ol key={run} className="grid gap-1.5">
            {data?.players.map((pl, i) => {
              const isSelected = i === selected;
              return (
                <li key={pl.id} className={SETTLE} style={{ animationDelay: `${i * 45}ms` }}>
                  <button
                    onClick={() => setSelected(i)}
                    aria-pressed={isSelected}
                    className={cn(
                      "grid w-full grid-cols-[22px_36px_minmax(0,1fr)_38px] items-center gap-3 rounded-xl border border-transparent bg-secondary px-3 py-2.5 text-left transition-colors hover:border-input",
                      isSelected && "border-brand/45 bg-brand-soft hover:border-brand/45",
                    )}
                  >
                    <span className={cn("text-center text-[13px] font-semibold text-faint", isSelected && "text-brand-strong")}>{i + 1}</span>
                    <Avatar player={pl} size={36} />
                    <span className="grid min-w-0 gap-0.5">
                      <b className="truncate text-[14.5px] font-semibold tracking-tight">{pl.name}</b>
                      <small className="truncate text-xs leading-snug text-muted-foreground">
                        {pl.position} · {pl.club ?? "Club unknown"} · {dash(pl.age)} · {eur(pl.market_value_eur_m)}
                      </small>
                    </span>
                    <FitScore fit={pl.fit} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="min-w-0 bg-card p-5" aria-labelledby="demo-3">
        <Step n={3} id="demo-3">
          The player
        </Step>
        {p && !loading && (
          <div key={p.id} className={SETTLE}>
            <div className="flex items-center gap-3">
              <Avatar player={p} size={56} prefer="cutout" />
              <div className="min-w-0">
                <p className="text-[20px] leading-tight font-bold tracking-tight">{p.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <ClubBadge src={p.clubBadge} size={14} /> {[p.club, p.league].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed">{p.fit_reason}</p>
            <ul className="mt-3">
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
                <span>{p.season} league</span>
                <b className="font-cond text-[15px]">
                  {dash(p.appearances)} apps · {dash(p.goals)} G · {dash(p.assists)} A
                </b>
              </li>
              {p.key_stats.slice(0, 4).map((s) => (
                <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
                  <span>{s.label}</span>
                  <b className="font-cond text-[15px]">{s.value}</b>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <SourceList sources={p.sources.slice(0, 3)} compact />
            </div>
            <Link href="/app" className="group mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-strong">
              Open his full profile and report <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
