import { Check, Minus } from "lucide-react";
import { Glow, Section, SectionHeading } from "@/components/site/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FaqList, PlaceholderNote, PlanCard } from "./blocks.tsx";
import { COMPARISON, PLANS, PRICES_ARE_PLACEHOLDERS } from "./plans.ts";

const PRICING_FAQ = [
  {
    q: "Which plan should a department start on?",
    a: "Club, if more than one scout will brief players. Scout suits one analyst or a trial, and Enterprise is for clubs that need their own data connected.",
  },
  {
    q: "Is the data real?",
    a: "Every plan finds real, current players with live web search, each fact linked to its source. Connecting a licensed data provider (Opta, Wyscout and similar) is part of Enterprise.",
  },
  {
    q: "What does an account include?",
    a: "Each scout signs in with their own email and password and gets the full workspace: briefs, shortlists, attribute sheets, comparisons, reports and the assistant.",
  },
];

const cell = (v: string | boolean) =>
  v === true ? (
    <Check aria-label="Included" className="mx-auto size-[18px] text-brand-strong" />
  ) : v === false ? (
    <Minus aria-label="Not included" className="mx-auto size-[18px] text-faint" />
  ) : (
    v
  );

export function PricingPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden pt-16 md:pt-24">
        <Glow className="-top-72" />
        <div className="container flex flex-col items-center text-center">
          <p className="text-sm font-medium text-brand-strong">Pricing</p>
          <h1 className="mt-4 max-w-[17ch] font-heading text-5xl leading-[1.04] font-extrabold tracking-tight text-balance md:text-6xl">
            Pricing for recruitment departments
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
            Every plan has the full scouting workspace. Plans differ by how many scouts use it and how much help you get setting up.
          </p>
          {PRICES_ARE_PLACEHOLDERS && <PlaceholderNote className="mt-6" />}
        </div>
        <div className="container mt-14 grid items-stretch gap-4 lg:grid-cols-3" aria-label="Plans">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <Section aria-labelledby="compare-h">
        <SectionHeading id="compare-h" title="Compare plans" className="mb-8" />
        <div className="overflow-hidden rounded-2xl border">
          <Table className="min-w-[640px] text-[14.5px]">
            <TableHeader className="bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 px-5 font-medium text-faint">Feature</TableHead>
                {PLANS.map((p) => (
                  <TableHead key={p.id} className="h-12 px-5 text-center font-semibold text-foreground">
                    {p.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON.map((row) => (
                <TableRow key={row.feature} className="hover:bg-secondary/50">
                  <TableHead scope="row" className="h-auto px-5 py-4 font-normal whitespace-normal text-foreground">
                    {row.feature}
                  </TableHead>
                  {row.values.map((v, i) => (
                    <TableCell key={i} className="px-5 py-4 text-center">
                      {cell(v)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section className="pt-0 md:pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeading className="mb-0" title="Questions about plans" />
          <FaqList items={PRICING_FAQ} />
        </div>
      </Section>
    </>
  );
}
