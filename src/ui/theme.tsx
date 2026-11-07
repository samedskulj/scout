"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * Light and dark themes. The choice is saved in this browser; until a scout picks one, the OS setting decides.
 * THEME_SCRIPT runs before first paint (see src/app/layout.tsx) so the page never flashes the wrong theme.
 */
export type Theme = "light" | "dark";
const KEY = "scout-copilot:theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;

const listeners = new Set<() => void>();

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  listeners.forEach((l) => l());
}

function saved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Subscribers also follow the OS setting while the scout hasn't chosen a theme. */
function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const mq = matchMedia("(prefers-color-scheme: light)");
  const onOs = () => {
    const s = saved();
    if (s !== "light" && s !== "dark") apply(mq.matches ? "light" : "dark");
  };
  mq.addEventListener("change", onOs);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onOs);
  };
}

const current = (): Theme => (document.documentElement.classList.contains("light") ? "light" : "dark");

export function ThemeToggle({ className = "" }: { className?: string }) {
  // null on the server: the class is only known after THEME_SCRIPT has run in the browser.
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        apply(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // Storage blocked: the theme still applies for this visit.
        }
      }}
    >
      {theme === "light" ? <Moon aria-hidden /> : <Sun aria-hidden className={theme ? "" : "opacity-0"} />}
    </button>
  );
}
