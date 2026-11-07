"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export const NAV_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Sticky translucent navbar: brand, pill links, account actions; a sheet menu on phones. */
export function SiteHeader() {
  const { session } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const actions = session ? (
    <Button asChild size="sm" className="h-9 rounded-full px-4">
      <Link href="/app">Open the app</Link>
    </Button>
  ) : (
    <>
      <Button asChild variant="ghost" size="sm" className="h-9 rounded-full px-4 text-muted-foreground">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="h-9 rounded-full px-4">
        <Link href="/login?mode=signup">Get started</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="container flex h-16 items-center gap-8">
        <Logo />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    pathname === l.href && "bg-secondary text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">{actions}</div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="ml-auto size-9 lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetHeader>
              <SheetTitle asChild>
                <div>
                  <Logo />
                </div>
              </SheetTitle>
            </SheetHeader>
            {/* Any link click inside the menu closes it. */}
            <nav
              aria-label="Main"
              className="flex flex-col gap-1 px-4"
              onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
            >
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-base font-medium hover:bg-secondary">
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4 [&_a]:w-full">{actions}</div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
