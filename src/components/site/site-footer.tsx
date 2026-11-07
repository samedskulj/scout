import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Features" },
      { href: "/#how", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/login?mode=signup", label: "Create account" },
      { href: "/app", label: "Open the app" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-assisted player recruitment for club scouting departments.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-xs font-semibold tracking-wider text-faint uppercase">{col.title}</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 border-t pt-8 text-[13px] text-faint md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Scout Copilot.</p>
          <p className="max-w-2xl md:text-right">
            Player facts are found live on the web by AI, each with its source. Photos and badges: TheSportsDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
