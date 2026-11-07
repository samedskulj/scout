import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SALES_EMAIL, type Plan } from "./plans.ts";

/** A plan card. `compact` is the landing-page preview (no feature list). */
export function PlanCard({ plan, compact = false }: { plan: Plan; compact?: boolean }) {
  const highlight = Boolean(plan.highlight);
  const contact = plan.cta.to === "contact";
  return (
    <Card
      aria-labelledby={`plan-${plan.id}`}
      className={cn(
        "gap-6 rounded-3xl border py-8 shadow-none ring-0",
        highlight
          ? "border-brand/55 bg-[linear-gradient(180deg,rgb(124_134_255/0.12),var(--card)_55%)] shadow-[0_40px_80px_-40px_rgb(124_134_255/0.45)]"
          : "border-border",
      )}
    >
      <CardHeader className="gap-3 px-7">
        <div className="flex items-center justify-between gap-2">
          <CardTitle id={`plan-${plan.id}`} className="text-lg font-bold">
            {plan.name}
          </CardTitle>
          {plan.highlight && (
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">{plan.highlight}</span>
          )}
        </div>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-heading text-5xl font-extrabold tracking-tight">{plan.price}</span>
          <span className="text-sm text-muted-foreground">{plan.unit}</span>
        </p>
        <CardDescription className="min-h-[3em] text-[14.5px] leading-normal">{plan.for}</CardDescription>
      </CardHeader>
      {!compact && (
        <CardContent className="px-7">
          <ul className="flex flex-col gap-3 border-t pt-6">
            {plan.includes.map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-snug">
                <CircleCheck className="mt-px size-[17px] shrink-0 text-brand-strong" aria-hidden /> {i}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
      <CardFooter className={cn("mt-auto border-0 bg-transparent px-7 pb-8", compact ? "pt-0" : "pt-2")}>
        <Button asChild variant={highlight ? "default" : "outline"} size="lg" className="h-11 w-full rounded-full text-[15px]">
          {contact && SALES_EMAIL ? (
            <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Scout Copilot Enterprise")}`}>{plan.cta.label}</a>
          ) : (
            <Link href={contact && compact ? "/pricing" : "/login?mode=signup"}>{plan.cta.label}</Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="border-t">
      {items.map((f) => (
        <AccordionItem key={f.q} value={f.q}>
          <AccordionTrigger className="py-5 text-base font-semibold tracking-tight hover:no-underline md:text-[17px]">{f.q}</AccordionTrigger>
          <AccordionContent className="max-w-[68ch] pb-5 text-[15.5px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function PlaceholderNote({ className }: { className?: string }) {
  return (
    <p className={cn("mt-4 inline-flex rounded-full bg-warn-soft px-3 py-1.5 text-[13px] text-warn", className)}>
      Sample prices: final pricing to be confirmed.
    </p>
  );
}
