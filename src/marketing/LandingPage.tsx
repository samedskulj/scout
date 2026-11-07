"use client";

import { AlertTriangle, ArrowRight, ArrowUpRight, Check, FileCheck2, LayoutList, ListOrdered, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Glow, Section, SectionHeading } from "@/components/site/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ability, ATTRIBUTE_GROUPS } from "../../shared/attributes.ts";
import { ordinal } from "../../shared/format.ts";
import { METRIC_IDS, METRICS, POSITIONS, type DemoResponse, type MetricId, type PlayerProfile } from "../../shared/types.ts";
import { Pitch } from "../scout/Pitch.tsx";
import { Radar } from "../scout/Radar.tsx";
import { Attr, Stars } from "../scout/Ratings.tsx";
import { LiveDemo } from "./LiveDemo.tsx";
import { FaqList, PlaceholderNote, PlanCard } from "./blocks.tsx";
import { PLANS, PRICES_ARE_PLACEHOLDERS } from "./plans.ts";

const FAQ = [
  {
    q: "Where does the player data come from?",
    a: "This version ships with a demo database of 300 fictional outfield players across eight leagues, so you can try every feature safely. Real data from your provider replaces that one file; on Enterprise we help you connect it.",
  },
  {
    q: "Is the AI making up the ratings?",
    a: "No. Claude reads your brief and writes reports; code does the ranking. Every 1–20 attribute is the player's percentile against others in his position, divided by five. Ability stars average the position's key metrics. Potential adds headroom for age and is always labelled an estimate.",
  },
  {
    q: "What stops a report from overstating a player?",
    a: "Every strength must sit at or above the 60th percentile and every weakness at or below the 40th. A claim that fails is flagged on the report in red, never hidden.",
  },
  {
    q: "What happens to our briefs?",
    a: "Briefs, report requests and assistant messages are sent to Anthropic's Claude API to be read and answered. Your account is managed with Supabase.",
  },
  {
    q: "Does it cover goalkeepers?",
    a: "Not yet. Rankings cover outfield players with at least 900 minutes, and stats are not yet adjusted for league strength.",
  },
];

const STATS = [
  { value: "300", label: "fictional players to try it on" },
  { value: "8", label: "leagues, 25 clubs" },
  { value: "12", label: "per-90 metrics per player" },
  { value: "60 / 40", label: "percentile bar every report claim must clear" },
];

const STEPS = [
  { title: "Brief it", body: "Type it the way the head coach said it. Claude turns it into positions, filters and priorities you can edit." },
  { title: "Check the ranking", body: "Players rank by their percentiles in what you asked for, with the stats that put each one there." },
  { title: "Compare", body: "Open a 1–20 sheet, then put him on a radar against similar or cheaper players." },
  { title: "Report", body: "Get a sign, monitor or pass report for the sporting director, every claim checked." },
];

const TRUST = [
  { icon: ListOrdered, title: "Rankings you can audit", body: "Players rank by weighted percentiles against their own position. Every row shows the stats that put him there." },
  { icon: FileCheck2, title: "Reports checked by code", body: "Strengths must be 60th percentile or better, weaknesses 40th or worse. Anything else is flagged on the report." },
  { icon: Sparkles, title: "AI that shows its working", body: "The brief Claude read is shown as filters you can edit. The assistant lists every search it ran." },
  { icon: UserRound, title: "Ratings with a source", body: "Each 1–20 attribute sits beside its per-90 number and percentile. Potential is always labelled an estimate." },
];

const RADAR_METRICS = ATTRIBUTE_GROUPS.flatMap((g) => g.metrics);

/** A report excerpt from the player's real percentiles, with one deliberately unsupported claim to show the check. */
function reportExample(p: PlayerProfile) {
  const ranked = [...METRIC_IDS].sort((x, y) => p.percentiles[y] - p.percentiles[x]);
  return [...ranked.slice(0, 2).map((m) => ({ metric: m, ok: true })), { metric: ranked.at(-1)!, ok: false }] as { metric: MetricId; ok: boolean }[];
}

export function LandingPage() {
  const [demo, setDemo] = useState<DemoResponse | null>(null);
  const top = demo?.matches[0]?.player;
  const second = demo?.matches[1]?.player;

  return (
    <>
      {/* Hero: centred headline over the working product */}
      <section className="relative isolate overflow-hidden pt-16 md:pt-24">
        <Glow className="-top-56" />
        <div className="container flex flex-col items-center text-center">
          <Badge asChild variant="outline" className="h-7 rounded-full border-input bg-secondary/60 px-3 text-[13px] text-muted-foreground">
            <a href="#how">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              AI reads the brief. Code ranks the players.
              <ArrowUpRight />
            </a>
          </Badge>
          <h1 className="mt-6 max-w-[17ch] font-heading text-5xl leading-[1.02] font-extrabold tracking-tight text-balance md:text-6xl lg:text-[80px]">
            From the coach&apos;s brief <span className="text-muted-foreground">to a shortlist you can defend.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl">
            Scout Copilot reads a recruitment brief the way your head coach says it, ranks every player on the numbers, and writes a scouting report
            that checks its own claims.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="group h-12 rounded-full px-6 text-[15px]">
              <Link href="/login?mode=signup">
                Get started <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-6 text-[15px]">
              <a href="#product">See how it works</a>
            </Button>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="What makes it different">
            {["Explainable rankings", "Every report claim checked", "Powered by Claude"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-brand-strong" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="container mt-14 md:mt-16">
          <div className="overflow-hidden rounded-2xl border border-input bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_40px_80px_-20px_rgb(0_0_0/0.7),0_0_120px_-40px_rgb(124_134_255/0.35)]">
            <div className="relative flex h-10 items-center gap-1.5 border-b bg-background px-4" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#2c3138]" />
              <span className="size-2.5 rounded-full bg-[#2c3138]" />
              <span className="size-2.5 rounded-full bg-[#2c3138]" />
              <p className="absolute left-1/2 hidden -translate-x-1/2 text-[12.5px] text-faint sm:block">Scout Copilot · Live demo</p>
            </div>
            <LiveDemo onResult={setDemo} />
          </div>
          <p className="mt-3.5 text-center text-[13px] text-faint">
            Try your own brief above. The demo uses the free keyword engine and fictional players; signed-in scouts get Claude.
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="pt-20 md:pt-28" aria-label="The demo database at a glance">
        <div className="container">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-background p-6 md:p-8">
                <dt className="order-2 text-sm text-muted-foreground">{s.label}</dt>
                <dd className="font-cond text-5xl leading-none font-bold tracking-tight md:text-6xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features bento */}
      <Section id="product">
        <SectionHeading
          eyebrow="Product"
          title="Everything a recruitment meeting needs, on one screen."
          lead="Ratings scouts already think in, comparisons that show the trade-offs, and reports a sporting director can trust."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tile
            wide
            title="Read every player like an attribute sheet"
            body="Twelve per-90 stats as 1–20 attributes against his position, with the real number and percentile beside each."
          >
            {top && <SheetShowcase player={top} />}
          </Tile>
          <Tile title="Reports that check their own claims" body="Anything the data doesn't back is flagged, not hidden.">
            {top && <ReportShowcase player={top} />}
          </Tile>
          <Tile title="Compare on one radar" body="Put him against the most similar profiles, or only the cheaper ones.">
            {top && second && (
              <div className="mt-auto grid place-items-center [&_.radar_svg]:max-w-[300px]">
                <Radar
                  axes={RADAR_METRICS.map((m) => METRICS[m].short)}
                  series={[
                    { name: top.name, values: RADAR_METRICS.map((m) => top.percentiles[m]) },
                    { name: second.name, values: RADAR_METRICS.map((m) => second.percentiles[m]) },
                  ]}
                />
              </div>
            )}
          </Tile>
          <Tile title="The brief, drawn on a pitch" body="See which positions Claude read, and click one to change the search.">
            <div className="mx-auto mt-auto w-full max-w-[230px]">
              <Pitch searched={demo?.spec.positions ?? []} selected={top?.position} />
            </div>
          </Tile>
          <Tile title="An assistant that runs the searches" body="Ask follow-ups like a colleague. Its picks land on your board.">
            <AssistantShowcase player={top} />
          </Tile>
        </div>
      </Section>

      {/* How it works: numbered steps with a connector line */}
      <Section id="how" className="pt-0 md:pt-0">
        <SectionHeading eyebrow="How it works" title="How a brief becomes a decision." lead="Four steps, and every one of them shows its working." />
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden className="absolute top-5 right-0 left-0 hidden h-px bg-gradient-to-r from-brand/50 via-border to-transparent lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col gap-3">
              <span className="relative inline-grid size-10 place-items-center rounded-xl border border-brand/40 bg-background font-cond text-lg font-bold text-brand-strong">
                {i + 1}
              </span>
              <h3 className="mt-2 text-lg font-bold tracking-tight">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Trust: sticky heading beside a feature list */}
      <Section className="pt-0 md:pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHeading
            className="mb-0 lg:sticky lg:top-28"
            eyebrow="Trust"
            title="Built to be checked, not trusted blindly."
            lead="AI reads and writes. Code ranks and verifies. Scouts see both."
          >
            <ArrowLink href="/login?mode=signup" className="mt-2">
              Start scouting
            </ArrowLink>
          </SectionHeading>
          <ul className="grid gap-px overflow-hidden rounded-2xl border bg-border">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[auto_1fr] gap-5 bg-card p-6 md:p-7">
                <span className="grid size-10 place-items-center rounded-xl border border-input bg-panel-3">
                  <Icon className="size-[19px] text-brand-strong" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section className="pt-0 md:pt-0" aria-labelledby="pricing-teaser">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <SectionHeading className="mb-0" id="pricing-teaser" eyebrow="Pricing" title="Priced per department." lead="Every plan includes the full scouting workspace." />
          <ArrowLink href="/pricing">Compare plans</ArrowLink>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} compact />
          ))}
        </div>
        {PRICES_ARE_PLACEHOLDERS && <PlaceholderNote />}
      </Section>

      {/* FAQ */}
      <Section id="faq" className="pt-0 md:pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeading
            className="mb-0"
            eyebrow="FAQ"
            title="Questions scouts ask."
            lead={
              <>
                Something else? See{" "}
                <Link href="/pricing" className="text-brand-strong underline-offset-4 hover:underline">
                  plans and contact
                </Link>
                .
              </>
            }
          />
          <FaqList items={FAQ} />
        </div>
      </Section>

      {/* Closing CTA band */}
      <Section className="pt-0 md:pt-0">
        <div className="relative isolate flex flex-col gap-10 overflow-hidden rounded-3xl border border-input bg-card p-8 md:p-14 lg:flex-row lg:items-center lg:justify-between">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_120%_at_0%_0%,rgb(124_134_255/0.22),transparent_70%)]" />
          <div>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">Bring your next brief.</h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">Create an account and run the brief you&apos;re working on today.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-6 text-[15px]">
              <Link href="/pricing">See pricing</Link>
            </Button>
            <Button asChild size="lg" className="group h-12 rounded-full px-6 text-[15px]">
              <Link href="/login?mode=signup">
                Get started <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-strong", className)}>
      {children} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function Tile({ title, body, wide, children }: { title: string; body: string; wide?: boolean; children?: ReactNode }) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-6 overflow-hidden rounded-2xl border bg-gradient-to-b from-panel-2 to-panel p-6 transition-colors hover:border-input md:p-7",
        wide && "md:col-span-2",
      )}
    >
      <div>
        <h3 className="text-[19px] leading-snug font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {children}
    </article>
  );
}

function SheetShowcase({ player }: { player: PlayerProfile }) {
  const a = ability(player);
  return (
    <figure className="rounded-xl border bg-background p-5" aria-label={`Attribute sheet for ${player.name}`}>
      <header className="mb-3.5 flex flex-col justify-between gap-4 border-b pb-3.5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xl leading-tight font-bold tracking-tight">{player.name}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {POSITIONS[player.position]} · {player.club} · {player.age}
          </p>
        </div>
        <div className="grid gap-1.5 sm:justify-items-end">
          <Stars current={a.current} potential={a.potential} size="lg" />
          <small className="text-[11px] font-semibold tracking-wider text-faint uppercase">Ability · potential (est.)</small>
        </div>
      </header>
      <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2">
        {ATTRIBUTE_GROUPS.map((g) => (
          <section key={g.label}>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-faint uppercase">{g.label}</h4>
            <ul>
              {g.metrics.map((m) => (
                <li key={m} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
                  <span>{METRICS[m].short}</span>
                  <small className="text-xs whitespace-nowrap text-muted-foreground">
                    {player.metrics[m]}
                    {METRICS[m].unit} · {ordinal(player.percentiles[m])}
                  </small>
                  <Attr percentile={player.percentiles[m]} metric={m} player={player} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </figure>
  );
}

function ReportShowcase({ player }: { player: PlayerProfile }) {
  return (
    <figure aria-label="Example report check">
      <ul className="grid gap-2">
        {reportExample(player).map((c) => (
          <li
            key={c.metric}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border bg-background px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]",
              !c.ok && "border-bad/30 bg-bad-soft",
            )}
          >
            <Attr percentile={player.percentiles[c.metric]} metric={c.metric} player={player} />
            <span>
              <b className="block text-sm font-semibold">{METRICS[c.metric].short}</b>
              <small className="text-[12.5px] text-muted-foreground">{ordinal(player.percentiles[c.metric])} percentile</small>
            </span>
            <em
              className={cn(
                "col-start-2 inline-flex items-center gap-1 text-[12.5px] font-semibold whitespace-nowrap not-italic sm:col-start-auto",
                c.ok ? "text-good" : "text-bad",
              )}
            >
              {c.ok ? <Check className="size-3.5" aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
              {c.ok ? "Checked" : "Flagged"}
            </em>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-[12.5px] text-faint">Example: calling his weakest stat a strength gets flagged.</figcaption>
    </figure>
  );
}

function AssistantShowcase({ player }: { player?: PlayerProfile }) {
  const name = player?.name ?? "the top centre-back";
  const steps = [
    { icon: UserRound, verb: "Opened", rest: name },
    { icon: Search, verb: "Searched", rest: "similar profile, under 60% of his value" },
    { icon: LayoutList, verb: "Put on the board", rest: "5 cheaper alternatives" },
  ];
  return (
    <figure className="mt-auto grid gap-3" aria-label="Example assistant conversation">
      <p className="max-w-[92%] justify-self-end rounded-2xl rounded-br-sm bg-panel-3 px-3.5 py-2.5 text-sm">Find me a cheaper version of {name}.</p>
      <ul className="grid gap-2 rounded-xl border bg-background px-3.5 py-3">
        {steps.map(({ icon: Icon, verb, rest }) => (
          <li key={verb} className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Icon className="size-[15px] flex-none text-brand-strong" aria-hidden />
            <span>
              <b className="font-semibold text-foreground">{verb}</b> {rest}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="text-[12.5px] text-faint">Example conversation.</figcaption>
    </figure>
  );
}
