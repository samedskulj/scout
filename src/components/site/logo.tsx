import Link from "next/link";
import { BrandMark } from "@/ui/BrandMark";
import { cn } from "@/lib/utils";

/** The brand mark and wordmark, linking home. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Scout Copilot home"
      className={cn("inline-flex items-center gap-2.5 text-[15.5px] font-bold tracking-tight text-foreground", className)}
    >
      <BrandMark />
      <span>Scout Copilot</span>
    </Link>
  );
}
