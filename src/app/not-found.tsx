import Link from "next/link";
import { Glow } from "@/components/site/section";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip text-base">
      <SiteHeader />
      <main className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
        <Glow className="-top-80" />
        <p className="font-cond text-8xl leading-none font-bold text-brand-strong">404</p>
        <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">This page is offside.</h1>
        <p className="mt-3 text-lg text-muted-foreground">The link may be old, or the page moved.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 rounded-full px-5">
            <Link href="/">Back to the home page</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-5">
            <Link href="/app">Open the app</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
