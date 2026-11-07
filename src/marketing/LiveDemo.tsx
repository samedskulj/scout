"use client";

import { ArrowRight, CornerDownLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ability } from "../../shared/attributes.ts";
import { money, ordinal } from "../../shared/format.ts";
import { KEY_METRICS, METRICS, POSITIONS, type DemoResponse, type SearchSpec } from "../../shared/types.ts";
import { Attr, Stars } from "../scout/Ratings.tsx";
import { apiPost, asApiError } from "../ui/api.ts";

export const DEMO_BRIEFS = [
  "Left-footed centre-back under 24, comfortable on the ball, max £30m",
  "Pressing striker under 26 from the Eredivisie or Liga Portugal",
  "Creative number 10 who can dribble, under £20m",
];

const SETTLE = "animate-[row-settle_320ms_cubic-bezier(0.16,1,0.3,1)_both]";

function readChips(s: SearchSpec): string[] {
  return [
    ...(s.positions.length ? s.positions.map((p) => POSITIONS[p]) : ["Any position"]),
    s.foot !== "any" ? `${s.foot === "left" ? "Left" : "Right"} foot` : null,
    s.max_age !== null ? `Age ≤ ${s.max_age}` : null,
    s.min_age !== null ? `Age ${s.min_age}+` : null,
    s.max_value_m !== null ? `≤ ${money(s.max_value_m)}` : null,
    ...s.leagues,
    ...s.priorities.map((p) => METRICS[p.metric].short),
  ].filter((x): x is string => Boolean(x));
}

function Step({ n, id, children, aside }: { n: number; id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <h2 id={id} className="mb-3.5 flex items-center gap-2.5 text-xs font-semibold tracking-wider text-faint uppercase">
      <span className="inline-grid size-5 place-items-center rounded-md bg-brand-soft text-brand-strong">{n}</span>
      {children}
      {aside && <em className="ml-auto text-[12.5px] font-medium tracking-normal normal-case not-italic">{aside}</em>}
    </h2>
  );
}

/** The hero: a working brief → shortlist → player strip on the public keyword engine. */
export function LiveDemo({ onResult }: { onResult?: (res: DemoResponse) => void }) {
  const [query, setQuery] = useState(DEMO_BRIEFS[0]!);
  const [data, setData] = useState<DemoResponse | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [run, setRun] = useState(0);

  const runBrief = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await apiPost<DemoResponse>("/api/demo", { query: q });
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

  // First load: run the default brief so the strip is never empty.
  useEffect(() => {
    let cancelled = false;
    apiPost<DemoResponse>("/api/demo", { query: DEMO_BRIEFS[0] }).then(
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
    if (query.trim().length >= 3) void runBrief(query);
  };

  const match = data?.matches[selected];
  const p = match?.player;
  const a = p ? ability(p) : null;

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
            {loading ? "Ranking players…" : "Run this brief"}
            <CornerDownLeft />
          </Button>
        </form>
        <div className="mt-3 grid gap-1.5">
          {DEMO_BRIEFS.filter((b) => b !== query).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                setQuery(b);
                void runBrief(b);
              }}
              className="rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] leading-snug text-muted-foreground transition-colors hover:border-input hover:bg-secondary hover:text-foreground"
            >
              {b}
            </button>
          ))}
        </div>
        {data && (
          <div className="mt-4 border-t pt-3.5">
            <h3 className="mb-2 text-[11.5px] font-semibold tracking-wider text-faint uppercase">Read as</h3>
            <ul className="flex flex-wrap gap-1.5">
              {readChips(data.spec).map((c) => (
                <li key={c} className="rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-medium text-brand-strong">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="order-3 min-w-0 bg-card p-5 md:col-span-2 lg:order-none lg:col-span-1" aria-labelledby="demo-2">
        <Step n={2} id="demo-2" aside={data && `${data.total} players fit`}>
          The shortlist
        </Step>
        {error && <p className="rounded-xl border border-dashed border-input p-3 text-bad">{error}</p>}
        {data && data.matches.length === 0 && (
          <p className="rounded-xl border border-dashed border-input p-3 text-muted-foreground">
            Nobody fits every filter. Loosen the brief and run it again.
          </p>
        )}
        <ol key={run} className="grid gap-1.5">
          {data?.matches.map((m, i) => {
            const isSelected = i === selected;
            return (
              <li key={m.player.id} className={SETTLE} style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  onClick={() => setSelected(i)}
                  aria-pressed={isSelected}
                  className={cn(
                    "grid w-full grid-cols-[22px_minmax(0,1fr)_38px] items-center gap-3 rounded-xl border border-transparent bg-secondary px-3 py-2.5 text-left transition-colors hover:border-input sm:grid-cols-[22px_minmax(0,1fr)_auto_38px]",
                    isSelected && "border-brand/45 bg-brand-soft hover:border-brand/45",
                  )}
                >
                  <span className={cn("text-center text-[13px] font-semibold text-faint", isSelected && "text-brand-strong")}>{i + 1}</span>
                  <span className="grid min-w-0 gap-0.5">
                    <b className="truncate text-[14.5px] font-semibold tracking-tight">{m.player.name}</b>
                    <small className="text-xs leading-snug text-muted-foreground">
                      {m.player.position} · {m.player.club} · {m.player.age} · {money(m.player.market_value_m)}
                    </small>
                  </span>
                  <span className="hidden flex-col items-end gap-1 text-xs font-medium whitespace-nowrap text-muted-foreground sm:flex">
                    {m.reasons.slice(0, 2).map((r) => (
                      <span key={r.metric} className="flex items-center gap-1">
                        {METRICS[r.metric].short} <Attr percentile={r.percentile} metric={r.metric} player={m.player} />
                      </span>
                    ))}
                  </span>
                  <span className="text-right font-cond text-[22px] leading-none font-bold">{m.score}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="min-w-0 bg-card p-5" aria-labelledby="demo-3">
        <Step n={3} id="demo-3">
          The player
        </Step>
        {p && a && (
          <div key={p.id} className={SETTLE}>
            <p className="text-[22px] leading-tight font-bold tracking-tight">{p.name}</p>
            <p className="mt-1 mb-3.5 text-[13px] text-muted-foreground">
              {POSITIONS[p.position]} · {p.club} · {p.league}
            </p>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-[11px] font-semibold tracking-wider text-faint uppercase">
              <span>Ability</span>
              <Stars current={a.current} />
              <span>Potential (est.)</span>
              <Stars current={a.current} potential={a.potential} />
            </div>
            <ul className="mt-4">
              {KEY_METRICS[p.position].map((m) => (
                <li key={m} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
                  <span>{METRICS[m].short}</span>
                  <small className="text-xs text-muted-foreground">
                    {p.metrics[m]}
                    {METRICS[m].unit} · {ordinal(p.percentiles[m])}
                  </small>
                  <Attr percentile={p.percentiles[m]} metric={m} player={p} />
                </li>
              ))}
            </ul>
            <Link href="/app" className="group mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-strong">
              Open his full profile and report <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
