import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A public-site section: generous vertical rhythm inside the 1200px container. */
export function Section({ id, className, children, ...rest }: { id?: string; className?: string; children: ReactNode; "aria-labelledby"?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 md:py-28", className)} {...rest}>
      <div className="container">{children}</div>
    </section>
  );
}

/** Eyebrow + headline + lead, the heading pattern every section shares. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  id,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn("mb-12 flex max-w-3xl flex-col gap-4", align === "center" && "mx-auto items-center text-center", className)}>
      {eyebrow && <p className="text-sm font-medium text-brand-strong">{eyebrow}</p>}
      <h2 id={id} className="font-heading text-4xl font-bold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      {lead && <p className="max-w-[58ch] text-lg leading-relaxed text-pretty text-muted-foreground">{lead}</p>}
      {children}
    </header>
  );
}

/** The faint indigo radial glow behind heroes and the closing panel (public site only). */
export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 -z-10 h-[720px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(124_134_255/0.22),rgb(124_134_255/0.06)_55%,transparent)]",
        className,
      )}
    />
  );
}
