"use client";

import { AlertTriangle, ArrowRight, ArrowUpRight, Check, FileCheck2, Globe, LayoutList, Link2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Glow, Section, SectionHeading } from "@/components/site/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dash, eur } from "../../shared/format.ts";
import type { DemoResponse, ScoutPlayer } from "../../shared/types.ts";
import { Avatar, ClubBadge, SourceList } from "../scout/bits.tsx";
import { Pitch } from "../scout/Pitch.tsx";
import { LiveDemo } from "./LiveDemo.tsx";
import { FaqList, PlaceholderNote, PlanCard } from "./blocks.tsx";
import { PLANS, PRICES_ARE_PLACEHOLDERS } from "./plans.ts";

const FAQ = [
  {
    q: "Where does the player data come from?",
    a: "From the live web. For every brief, the AI searches sites like Transfermarkt, FBref and official league pages for real, current players, and lists the pages each fact came from. Photos and club badges come from TheSportsDB.",
  },
  {
    q: "Can the AI make numbers up?",
    a: "It's told to report only what a source states, and anything it can't find shows as a dash, never a guess. Players whose cited pages didn't appear in its searches are dropped. Every player links to his sources so you can check.",
  },
  {
    q: "What stops a report from overstating a player?",
    a: "Every strength and weakness must point to a specific stat in his live profile. A claim that names a stat he doesn't have is flagged on the report in red, never hidden.",
  },
  {
    q: "What happens to our briefs?",
    a: "Briefs, report requests and assistant messages are sent to our AI provider's API to be read and answered. Your account is managed with Supabase.",
  },
  {
    q: "Which players does it cover?",
    a: "Any professional player the web has good information on: every position including goalkeepers, in any league. Coverage is best for Europe's top divisions, where sources publish the most stats.",
  },
];

const STATS = [
  { value: "Live", label: "every brief searched on today's web" },
  { value: "Any", label: "league, position or nationality" },
  { value: "100%", label: "of players listed with their sources" },
  { value: "0", label: "made-up numbers: unknowns show as a dash" },
];

const STEPS = [
  { title: "Brief it", body: "Type it the way the head coach said it. The AI reads it and searches the web for real, current players who fit." },
  { title: "Check the facts", body: "Each player comes with this season's numbers, his photo, and the pages every fact came from." },
  { title: "Go deeper", body: "Open a player for full season stats, recent seasons and news, researched live." },
  { title: "Report", body: "Get a sign, monitor or pass report for the sporting director, every claim checked against his stats." },
];

const TRUST = [
  { icon: Link2, title: "Every fact has a source", body: "Each player links to the pages his club, value and stats came from. Sources the search never returned are thrown out." },
  { icon: FileCheck2, title: "Reports checked by code", body: "Every strength and weakness must name a stat in his profile. Anything else is flagged on the report." },
  { icon: Sparkles, title: "AI that shows its working", body: "You see how the brief was read and every web search as it runs." },
  { icon: Globe, title: "Current, not cached forever", body: "Searches run against today's web and refresh daily, so transfers and form are up to date." },
];

export function LandingPage() {
  const [demo, setDemo] = useState<DemoResponse | null>(null);
  const top = demo?.players[0];

  return (
    <>
      {/* Hero: centred headline over the working product */}
      <section className="relative isolate overflow-hidden pt-16 md:pt-24">
        <Glow className="-top-56" />
        <div className="container flex flex-col items-center text-center">
          <Badge asChild variant="outline" className="h-7 rounded-full border-input bg-secondary/60 px-3 text-[13px] text-muted-foreground">
            <a href="#how">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              AI searches the live web. Every fact has a source.
              <ArrowUpRight />
            </a>
          </Badge>
          <h1 className="mt-6 max-w-[17ch] font-heading text-5xl leading-[1.02] font-extrabold tracking-tight text-balance md:text-6xl lg:text-[80px]">
            From the coach&apos;s brief <span className="text-muted-foreground">to a shortlist you can defend.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl">
            Scout Copilot reads a recruitment brief the way your head coach says it, finds real players who fit on today's web, and writes a scouting report
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
            {["Real, current players", "Every fact sourced", "Every report claim checked"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-brand-strong" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="container mt-14 md:mt-16">
          <div className="overflow-hidden rounded-2xl border border-input bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_40px_80px_-20px_rgb(0_0_0/0.7),0_0_120px_-40px_rgb(124_134_255/0.35)] [.light_&]:shadow-[0_0_0_1px_rgb(18_21_26/0.06),0_40px_80px_-30px_rgb(18_21_26/0.25),0_0_120px_-40px_rgb(76_88_214/0.3)]">
            <div className="relative flex h-10 items-center gap-1.5 border-b bg-background px-4" aria-hidden>
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <p className="absolute left-1/2 hidden -translate-x-1/2 text-[12.5px] text-faint sm:block">Scout Copilot · Live demo</p>
            </div>
            <LiveDemo onResult={setDemo} />
          </div>
          <p className="mt-3.5 text-center text-[13px] text-faint">
            Try your own brief above. The AI searches today's web for real players; signed-in scouts get the full workspace.
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="pt-20 md:pt-28" aria-label="At a glance">
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
          lead="Real players with photos and current numbers, sources you can click, and reports a sporting director can trust."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tile wide title="A real player card, researched live" body="Club, age, value, contract and this season's numbers, with his photo and the pages it all came from.">
            {top && <CardShowcase player={top} />}
          </Tile>
          <Tile title="Reports that check their own claims" body="Anything his stats don't back is flagged, not hidden.">
            {top && <ReportShowcase player={top} />}
          </Tile>
          <Tile title="Every fact, one click from its source" body="Transfermarkt, FBref, league and club pages. Check anything before the meeting.">
            {top && <SourceList sources={top.sources.slice(0, 4)} />}
          </Tile>
          <Tile title="The brief, drawn on a pitch" body="See which positions the AI read before you look at a single name.">
            <div className="mx-auto mt-auto w-full max-w-[230px]">
              <Pitch searched={demo?.read.positions ?? []} selected={top?.position} />
            </div>
          </Tile>
          <Tile title="An assistant that searches for you" body="Ask follow-ups like a colleague. It searches the web and puts its picks on your board.">
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

function CardShowcase({ player }: { player: ScoutPlayer }) {
  return (
    <figure className="rounded-xl border bg-background p-5" aria-label={`Player card for ${player.name}`}>
      <header className="mb-3.5 flex items-center gap-4 border-b pb-3.5">
        <Avatar player={player} size={64} prefer="cutout" />
        <div className="min-w-0">
          <p className="text-xl leading-tight font-bold tracking-tight">{player.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <ClubBadge src={player.clubBadge} size={14} /> {[player.club, player.league].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {player.role} · {dash(player.age)} · {eur(player.market_value_eur_m)} · contract {dash(player.contract_until)}
          </p>
        </div>
      </header>
      <ul className="grid gap-x-7 sm:grid-cols-2">
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
          <span>{player.season} league</span>
          <b className="font-cond text-[15px]">
            {dash(player.appearances)} apps · {dash(player.goals)} G · {dash(player.assists)} A
          </b>
        </li>
        {player.key_stats.slice(0, 5).map((s) => (
          <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b py-1.5 text-[13.5px]">
            <span>{s.label}</span>
            <b className="font-cond text-[15px]">{s.value}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function ReportShowcase({ player }: { player: ScoutPlayer }) {
  const claims = [
    ...player.key_stats.slice(0, 2).map((s) => ({ label: s.label, value: s.value, ok: true })),
    { label: "Aerial duels won %", value: null, ok: false },
  ].filter((c, i, all) => all.findIndex((x) => x.label === c.label) === i);
  return (
    <figure aria-label="Example report check">
      <ul className="grid gap-2">
        {claims.map((c) => (
          <li
            key={c.label}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border bg-background px-3 py-2.5",
              !c.ok && "border-bad/30 bg-bad-soft",
            )}
          >
            <span>
              <b className="block text-sm font-semibold">{c.label}</b>
              <small className="text-[12.5px] text-muted-foreground">{c.value ?? "not in his stats"}</small>
            </span>
            <em className={cn("inline-flex items-center gap-1 text-[12.5px] font-semibold whitespace-nowrap not-italic", c.ok ? "text-good" : "text-bad")}>
              {c.ok ? <Check className="size-3.5" aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
              {c.ok ? "Checked" : "Flagged"}
            </em>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-[12.5px] text-faint">Example: a claim resting on a stat he doesn't have gets flagged.</figcaption>
    </figure>
  );
}

function AssistantShowcase({ player }: { player?: ScoutPlayer }) {
  const name = player?.name ?? "the top centre-back";
  const steps = [
    { icon: Search, verb: "Searched", rest: `${name} market value` },
    { icon: Search, verb: "Searched", rest: "similar centre-backs under €20m" },
    { icon: LayoutList, verb: "Put on the board", rest: "5 cheaper alternatives" },
  ];
  return (
    <figure className="mt-auto grid gap-3" aria-label="Example assistant conversation">
      <p className="max-w-[92%] justify-self-end rounded-2xl rounded-br-sm bg-panel-3 px-3.5 py-2.5 text-sm">Find me a cheaper version of {name}.</p>
      <ul className="grid gap-2 rounded-xl border bg-background px-3.5 py-3">
        {steps.map(({ icon: Icon, verb, rest }, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px] text-muted-foreground">
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
